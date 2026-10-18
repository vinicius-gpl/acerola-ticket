package machine

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestLoad(t *testing.T) {
	config := Config{ServerURL: "https://dashboard.example.test", TokenCipher: "cipher", SignerSHA256: strings.Repeat("a", 64), AutoUpdate: true}
	path := filepath.Join(t.TempDir(), "machine.json")
	content, _ := json.Marshal(config)
	if err := os.WriteFile(path, content, 0600); err != nil {
		t.Fatal(err)
	}
	// feliz: usa a identidade da máquina sem depender da sessão humana.
	got, identity, err := Load(path, func(string) (string, error) { return "fixture-token", nil })
	if err != nil || !got.AutoUpdate || identity.Token != "fixture-token" || identity.ServerURL != "wss://dashboard.example.test/agent" {
		t.Fatalf("%+v %v", identity, err)
	}
	// triste: nunca inclui o segredo na mensagem de erro de decriptação.
	_, _, err = Load(path, func(string) (string, error) { return "", errors.New("sensitive DPAPI detail") })
	if err == nil || strings.Contains(err.Error(), "sensitive") {
		t.Fatalf("unexpected error: %v", err)
	}
	_, _, err = Load(path, func(string) (string, error) { return "", nil })
	if err == nil {
		t.Fatal("empty machine token must be rejected")
	}
}

func TestInvalidConfig(t *testing.T) {
	// triste: origem e certificado fora do contrato não iniciam atualização privilegiada.
	for _, origin := range []string{"http://dashboard.example.test", "https://user:pass@dashboard.example.test", "https://dashboard.example.test/?token=value", "https://dashboard.example.test/agent"} {
		if err := validate(Config{ServerURL: origin, SignerSHA256: strings.Repeat("a", 64)}); err == nil {
			t.Fatalf("accepted %s", origin)
		}
	}
	if err := validate(Config{ServerURL: "https://dashboard.example.test", SignerSHA256: strings.Repeat("z", 64)}); err == nil {
		t.Fatal("invalid certificate fingerprint")
	}
	if err := validate(Config{ServerURL: "https://dashboard.example.test", AutoUpdate: true}); err == nil {
		t.Fatal("autoUpdate without signer SHA256 must be rejected")
	}
	if err := validate(Config{ServerURL: "https://dashboard.example.test", AutoUpdate: false}); err != nil {
		t.Fatalf("reporting without autoUpdate should not require signer SHA256: %v", err)
	}
	if err := validate(Config{ServerURL: "http://localhost:3000", SignerSHA256: strings.Repeat("a", 64), AutoUpdate: true}); err != nil {
		t.Fatalf("localhost http should be permitted for local development: %v", err)
	}
	if err := validate(Config{ServerURL: "http://192.168.1.50:3000", AutoUpdate: false}); err != nil {
		t.Fatalf("private IP http should be permitted: %v", err)
	}
	if err := validate(Config{ServerURL: "http://servidor-local:3000", AutoUpdate: false}); err != nil {
		t.Fatalf("local hostname http should be permitted: %v", err)
	}
}
