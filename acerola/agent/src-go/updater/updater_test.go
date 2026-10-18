package updater

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestNewer(t *testing.T) {
	// feliz: comparação numérica, sem depender da ordem alfabética.
	for _, pair := range [][2]string{{"1.10.0", "1.9.9"}, {"2.0.0", "1.99.0"}} {
		newer, err := Newer(pair[0], pair[1])
		if err != nil || !newer {
			t.Fatalf("expected upgrade: %v %v", newer, err)
		}
	}
	// triste: nunca instala downgrade, mesma versão ou texto fora do contrato do MSI.
	for _, pair := range [][2]string{{"1.0.0", "1.0.0"}, {"0.9.9", "1.0.0"}, {"1.0.0-beta", "1.0.0"}, {"01.0.0", "1.0.0"}, {"1.0.65536", "0.1.0"}, {"1.256.0", "0.1.0"}} {
		newer, _ := Newer(pair[0], pair[1])
		if newer {
			t.Fatalf("unexpected upgrade: %v", pair)
		}
	}
}

type updateFixture struct {
	t           *testing.T
	scenario    string
	server      *httptest.Server
	release     Release
	payload     []byte
	installed   int
	tokenLeaked bool
}

func newFixture(t *testing.T, scenario string) *updateFixture {
	fixture := &updateFixture{t: t, scenario: scenario, payload: []byte("test MSI payload")}
	hash := sha256.Sum256(fixture.payload)
	fixture.release = Release{Version: "1.2.0", SHA256: hex.EncodeToString(hash[:]), SizeBytes: int64(len(fixture.payload))}
	if scenario == "hash" {
		fixture.release.SHA256 = strings.Repeat("0", 64)
	}
	if scenario == "size" {
		fixture.release.SizeBytes++
	}
	if scenario == "downgrade" {
		fixture.release.Version = "0.9.0"
	}
	fixture.server = httptest.NewTLSServer(http.HandlerFunc(fixture.handle))
	t.Cleanup(fixture.server.Close)
	return fixture
}

func (fixture *updateFixture) handle(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/package.msi" {
		fixture.tokenLeaked = r.Header.Get("Authorization") != ""
		_, _ = w.Write(fixture.payload)
		return
	}
	if r.Header.Get("Authorization") != "Bearer fixture-token" {
		fixture.t.Error("missing machine authentication")
	}
	if fixture.scenario == "unauthorized" {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}
	if fixture.scenario == "none" {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if fixture.scenario == "redirect" {
		http.Redirect(w, r, fixture.server.URL+"/package.msi", http.StatusFound)
		return
	}
	fixture.release.URL = fixture.server.URL + "/package.msi"
	if fixture.scenario == "http" {
		fixture.release.URL = "http://storage.example.test/package.msi"
	}
	_ = json.NewEncoder(w).Encode(fixture.release)
}

func (fixture *updateFixture) verify(_ context.Context, path, fingerprint string) error {
	if fingerprint != strings.Repeat("a", 64) {
		fixture.t.Error("signer pin was not supplied")
	}
	if _, err := os.Stat(path); err != nil {
		fixture.t.Error(err)
	}
	if fixture.scenario == "signature" {
		return errors.New("unexpected signer")
	}
	return nil
}
func (fixture *updateFixture) install(string, string) error {
	fixture.installed++
	if fixture.scenario == "install" {
		return errors.New("installer launch failed")
	}
	return nil
}
func (fixture *updateFixture) client(t *testing.T) Client {
	return Client{HTTP: fixture.server.Client(), ServerURL: fixture.server.URL, Token: "fixture-token", Directory: t.TempDir(), CurrentVersion: "1.0.0", SignerSHA256: strings.Repeat("a", 64), Verify: fixture.verify, Install: fixture.install}
}

func TestCheck(t *testing.T) {
	// triste: rede, integridade, autenticação e assinatura inválidas preservam a instalação atual.
	for _, scenario := range []string{"hash", "size", "signature", "unauthorized", "none", "redirect", "downgrade", "install", "http"} {
		t.Run(scenario, func(t *testing.T) {
			fixture := newFixture(t, scenario)
			client := fixture.client(t)
			started, err := client.Check(context.Background())
			if started {
				t.Fatal("unexpected installer launch")
			}
			if scenario != "none" && scenario != "downgrade" && err == nil {
				t.Fatal("expected failure")
			}
			if scenario != "install" && fixture.installed != 0 {
				t.Fatal("unsafe package was installed")
			}
			if fixture.tokenLeaked {
				t.Fatal("machine token leaked to storage")
			}
		})
	}
}

func TestValidCheckAndPersistentBackoff(t *testing.T) {
	// feliz: instala uma única vez e mantém o recuo mesmo com outra instância após restart.
	fixture := newFixture(t, "valid")
	client := fixture.client(t)
	started, err := client.Check(context.Background())
	if !started || err != nil || fixture.installed != 1 {
		t.Fatalf("%v %v %d", started, err, fixture.installed)
	}
	restarted := client
	again, err := restarted.Check(context.Background())
	if again || err != nil || fixture.installed != 1 {
		t.Fatal("must back off across process restarts")
	}
	if fixture.tokenLeaked {
		t.Fatal("machine token leaked to storage")
	}
}
