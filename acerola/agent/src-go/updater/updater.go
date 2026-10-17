// Package updater baixa somente MSI de uma release autenticada e exige o assinante provisionado pelo TI.
package updater

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const maxPackageBytes = 512 * 1024 * 1024

var versionPattern = regexp.MustCompile(`^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$`)
var hashPattern = regexp.MustCompile(`^[a-fA-F0-9]{64}$`)

type Release struct {
	Version   string `json:"version"`
	URL       string `json:"url"`
	SHA256    string `json:"sha256"`
	SizeBytes int64  `json:"sizeBytes"`
}

type Client struct {
	HTTP           *http.Client
	ServerURL      string
	Token          string
	Directory      string
	CurrentVersion string
	SignerSHA256   string
	Verify         func(context.Context, string, string) error
	Install        func(string, string) error
}

func HTTPClient() *http.Client {
	return &http.Client{Timeout: 15 * time.Minute, CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 || req.URL.Scheme != "https" {
			return errors.New("updater: unsafe redirect")
		}
		return nil
	}}
}

func versionParts(value string) ([3]uint64, error) {
	var parts [3]uint64
	if !versionPattern.MatchString(value) {
		return parts, errors.New("updater: invalid version")
	}
	for index, field := range strings.Split(value, ".") {
		part, err := strconv.ParseUint(field, 10, 16)
		if err != nil {
			return parts, errors.New("updater: version out of range")
		}
		parts[index] = part
	}
	if parts[0] > 255 || parts[1] > 255 {
		return parts, errors.New("updater: MSI version out of range")
	}
	return parts, nil
}

func Newer(candidate, current string) (bool, error) {
	a, err := versionParts(candidate)
	if err != nil {
		return false, err
	}
	b, err := versionParts(current)
	if err != nil {
		return false, err
	}
	for index := range a {
		if a[index] != b[index] {
			return a[index] > b[index], nil
		}
	}
	return false, nil
}

// Check devolve true só depois de entregar o MSI validado ao instalador independente.
func (client *Client) Check(ctx context.Context) (bool, error) {
	release, err := client.latest(ctx)
	if err != nil || release == nil {
		return false, err
	}
	newer, err := Newer(release.Version, client.CurrentVersion)
	if err != nil || !newer {
		return false, err
	}
	if err = validateMetadata(*release); err != nil {
		return false, err
	}
	if client.recentAttempt(release.Version) {
		return false, nil
	}
	return client.apply(ctx, *release)
}

func validateMetadata(release Release) error {
	if !hashPattern.MatchString(release.SHA256) || release.SizeBytes < 1 || release.SizeBytes > maxPackageBytes {
		return errors.New("updater: invalid package metadata")
	}
	return nil
}

func (client *Client) apply(ctx context.Context, release Release) (bool, error) {
	if err := os.MkdirAll(client.Directory, 0700); err != nil {
		return false, err
	}
	path := filepath.Join(client.Directory, "agent-"+release.Version+".msi")
	if err := client.download(ctx, release, path); err != nil {
		return false, err
	}
	if err := client.Verify(ctx, path, client.SignerSHA256); err != nil {
		_ = os.Remove(path)
		return false, fmt.Errorf("updater: signature refused: %w", err)
	}
	// Persiste o recuo: se o MSI falhar e reiniciar a versão antiga, não entra em ciclo no boot.
	content, err := json.Marshal(attempt{Version: release.Version, At: time.Now().UTC()})
	if err != nil {
		return false, err
	}
	if err = os.WriteFile(filepath.Join(client.Directory, "last-attempt.json"), content, 0600); err != nil {
		return false, err
	}
	if err = client.Install(path, filepath.Join(client.Directory, "install.log")); err != nil {
		return false, err
	}
	return true, nil
}

type attempt struct {
	Version string
	At      time.Time
}

func (client *Client) recentAttempt(version string) bool {
	content, err := os.ReadFile(filepath.Join(client.Directory, "last-attempt.json"))
	if err != nil {
		return false
	}
	var previous attempt
	if json.Unmarshal(content, &previous) != nil {
		return false
	}
	return previous.Version == version && time.Since(previous.At) < time.Hour
}

func (client *Client) latest(ctx context.Context) (*Release, error) {
	endpoint := strings.TrimRight(client.ServerURL, "/") + "/api/agent/releases/latest"
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, errors.New("updater: invalid server endpoint")
	}
	if request.URL.Scheme != "https" {
		return nil, errors.New("updater: HTTPS is required")
	}
	request.Header.Set("Authorization", "Bearer "+client.Token)
	// Não segue redirecionamento na chamada autenticada, nem para outro HTTPS.
	transport := *client.HTTP
	transport.CheckRedirect = func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }
	response, err := transport.Do(request)
	if err != nil {
		return nil, errors.New("updater: release server unavailable")
	}
	defer func() { _ = response.Body.Close() }()
	if response.StatusCode == http.StatusNoContent {
		return nil, nil
	}
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("updater: release server returned %d", response.StatusCode)
	}
	var release Release
	if err = json.NewDecoder(io.LimitReader(response.Body, 16384)).Decode(&release); err != nil {
		return nil, errors.New("updater: invalid release response")
	}
	return &release, nil
}

func (client *Client) download(ctx context.Context, release Release, path string) error {
	response, err := client.packageResponse(ctx, release.URL)
	if err != nil {
		return err
	}
	defer func() { _ = response.Body.Close() }()
	temporary, err := os.CreateTemp(client.Directory, "download-*.part")
	if err != nil {
		return err
	}
	defer func() { _ = os.Remove(temporary.Name()) }()
	if err = copyPackage(temporary, response.Body, release); err != nil {
		return err
	}
	// O diretório é exclusivo de SYSTEM/administradores; ninguém troca o arquivo entre hash e instalação.
	_ = os.Remove(path)
	return os.Rename(temporary.Name(), path)
}

func (client *Client) packageResponse(ctx context.Context, address string) (*http.Response, error) {
	parsed, err := url.Parse(address)
	if err != nil {
		return nil, errors.New("updater: invalid package URL")
	}
	if parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil {
		return nil, errors.New("updater: package URL must be HTTPS")
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, address, nil)
	if err != nil {
		return nil, errors.New("updater: invalid package URL")
	}
	// Nunca repassa o token da máquina ao storage.
	response, err := client.HTTP.Do(request)
	if err != nil {
		return nil, errors.New("updater: package download failed")
	}
	if response.StatusCode != http.StatusOK {
		_ = response.Body.Close()
		return nil, fmt.Errorf("updater: package download returned %d", response.StatusCode)
	}
	return response, nil
}

func copyPackage(file *os.File, body io.Reader, release Release) error {
	hash := sha256.New()
	size, copyError := io.Copy(io.MultiWriter(file, hash), io.LimitReader(body, release.SizeBytes+1))
	closeError := file.Close()
	if copyError != nil {
		return errors.New("updater: incomplete download")
	}
	if closeError != nil {
		return closeError
	}
	if size != release.SizeBytes || !strings.EqualFold(hex.EncodeToString(hash.Sum(nil)), release.SHA256) {
		return errors.New("updater: package size or SHA256 mismatch")
	}
	return nil
}
