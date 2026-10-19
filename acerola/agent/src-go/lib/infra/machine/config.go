// Package machine lê a identidade da máquina, separada do cofre do usuário da bandeja.
package machine

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/modules/settings"
)

const ServiceName = "AcerolaAgent"

type Config struct {
	ServerURL    string `json:"serverUrl"`
	TokenCipher  string `json:"tokenCipher"`
	SignerSHA256 string `json:"signerSha256"`
	AutoUpdate   bool   `json:"autoUpdate"`
}

func Directory() string { return filepath.Join(os.Getenv("ProgramData"), "AcerolaAgent") }

// Configured informa se a máquina possui uma configuração válida gravada em disco.
func Configured() bool {
	configPath := filepath.Join(Directory(), "machine.json")
	content, err := os.ReadFile(configPath)
	if err != nil {
		return false
	}
	var cfg Config
	if err := json.Unmarshal(content, &cfg); err != nil {
		return false
	}
	return cfg.ServerURL != "" && cfg.TokenCipher != ""
}

func Load(path string, decrypt func(string) (string, error)) (Config, settings.Config, error) {
	var config Config
	content, err := os.ReadFile(path)
	if err != nil {
		return config, settings.Config{}, err
	}
	if err = json.Unmarshal(content, &config); err != nil {
		return config, settings.Config{}, errors.New("machine: invalid config JSON")
	}
	if err = validate(config); err != nil {
		return config, settings.Config{}, err
	}
	config.ServerURL = strings.TrimRight(config.ServerURL, "/")
	token, err := decrypt(config.TokenCipher)
	if err != nil {
		return config, settings.Config{}, errors.New("machine: cannot decrypt machine credential")
	}
	reportingConfig, err := settings.Load(func(key string) string {
		if key == "ACEROLA_SERVER_URL" {
			return config.ServerURL
		}
		if key == "ACEROLA_AGENT_TOKEN" {
			return token
		}
		return ""
	}, "")
	if err != nil {
		return config, settings.Config{}, fmt.Errorf("machine: invalid reporting configuration: %w", err)
	}
	return config, reportingConfig, nil
}

func isLocalOrPrivate(host string) bool {
	if host == "localhost" || !strings.Contains(host, ".") || strings.HasSuffix(host, ".local") {
		return true
	}
	ip := net.ParseIP(host)
	if ip != nil {
		return ip.IsLoopback() || ip.IsPrivate()
	}
	return false
}

func validate(config Config) error {
	if err := validateOrigin(config.ServerURL); err != nil {
		return err
	}
	return validateSigner(config)
}

func validateOrigin(address string) error {
	endpoint, err := url.Parse(address)
	if err != nil {
		return errors.New("machine: invalid server URL")
	}
	if !allowedScheme(endpoint) || endpoint.Host == "" || endpoint.User != nil {
		return errors.New("machine: server origin must be HTTPS without credentials")
	}
	if endpoint.RawQuery != "" || endpoint.Fragment != "" || strings.Trim(endpoint.Path, "/") != "" {
		return errors.New("machine: server origin must not contain a path, query or fragment")
	}
	return nil
}

func allowedScheme(endpoint *url.URL) bool {
	return endpoint.Scheme == "https" || (endpoint.Scheme == "http" && isLocalOrPrivate(endpoint.Hostname()))
}

func validateSigner(config Config) error {
	if config.SignerSHA256 == "" {
		if config.AutoUpdate {
			return errors.New("machine: signer SHA256 is required when autoUpdate is enabled")
		}
		return nil
	}
	fingerprint, err := hex.DecodeString(config.SignerSHA256)
	if err != nil || len(fingerprint) != 32 {
		return errors.New("machine: invalid signer SHA256")
	}
	return nil
}

func LoadTrusted(path string) (Config, settings.Config, error) {
	if err := trustedFile(path); err != nil {
		return Config{}, settings.Config{}, err
	}
	return Load(path, Decrypt)
}
