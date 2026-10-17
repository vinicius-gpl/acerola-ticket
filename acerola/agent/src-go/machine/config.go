// Package machine lê a identidade da máquina, separada do cofre do usuário da bandeja.
package machine

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"path/filepath"
	"strings"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/reporting"
)

const ServiceName = "AcerolaAgent"

type Config struct {
	ServerURL    string `json:"serverUrl"`
	TokenCipher  string `json:"tokenCipher"`
	SignerSHA256 string `json:"signerSha256"`
	AutoUpdate   bool   `json:"autoUpdate"`
}

func Directory() string { return filepath.Join(os.Getenv("ProgramData"), "AcerolaAgent") }

func Load(path string, decrypt func(string) (string, error)) (Config, reporting.Config, error) {
	var config Config
	content, err := os.ReadFile(path)
	if err != nil {
		return config, reporting.Config{}, err
	}
	if err = json.Unmarshal(content, &config); err != nil {
		return config, reporting.Config{}, errors.New("machine: invalid config JSON")
	}
	if err = validate(config); err != nil {
		return config, reporting.Config{}, err
	}
	config.ServerURL = strings.TrimRight(config.ServerURL, "/")
	token, err := decrypt(config.TokenCipher)
	if err != nil {
		return config, reporting.Config{}, errors.New("machine: cannot decrypt machine credential")
	}
	reportingConfig, err := reporting.Load(func(key string) string {
		if key == "ACEROLA_SERVER_URL" {
			return config.ServerURL
		}
		if key == "ACEROLA_AGENT_TOKEN" {
			return token
		}
		return ""
	}, "")
	if err != nil {
		return config, reporting.Config{}, fmt.Errorf("machine: invalid reporting configuration: %w", err)
	}
	return config, reportingConfig, nil
}

func validate(config Config) error {
	endpoint, err := url.Parse(config.ServerURL)
	if err != nil {
		return errors.New("machine: invalid server URL")
	}
	if endpoint.Scheme != "https" || endpoint.Host == "" || endpoint.User != nil {
		return errors.New("machine: server origin must be HTTPS without credentials")
	}
	if endpoint.RawQuery != "" || endpoint.Fragment != "" || strings.Trim(endpoint.Path, "/") != "" {
		return errors.New("machine: server origin must not contain a path, query or fragment")
	}
	fingerprint, err := hex.DecodeString(config.SignerSHA256)
	if err != nil || len(fingerprint) != 32 {
		return errors.New("machine: invalid signer SHA256")
	}
	return nil
}

func LoadTrusted(path string) (Config, reporting.Config, error) {
	if err := trustedFile(path); err != nil {
		return Config{}, reporting.Config{}, err
	}
	return Load(path, Decrypt)
}
