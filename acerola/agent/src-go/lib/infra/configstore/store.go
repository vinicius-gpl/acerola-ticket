// Package configstore persiste a configuração local em JSON.
package configstore

import (
	"encoding/json"
	"os"
)

// Config é o formato persistido; TokenCipher permite migrar instalações antigas.
type Config struct {
	ServerURL       string `json:"serverUrl"`
	TokenCipher     string `json:"tokenCipher,omitempty"`
	IntervalSeconds int    `json:"intervalSeconds"`
}

func Read(path string) (Config, error) {
	content, err := os.ReadFile(path)
	if err != nil {
		return Config{}, err
	}
	var config Config
	err = json.Unmarshal(content, &config)
	return config, err
}

func Write(path string, config Config) error {
	content, err := json.MarshalIndent(config, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, content, 0o600)
}
