package reporting

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/secret"
)

// environmentOf devolve um leitor de ambiente feito de um mapa, para o teste
// não depender de variáveis reais da máquina que roda a suíte.
func environmentOf(values map[string]string) Environment {
	return func(key string) string { return values[key] }
}

// useFakeVault troca o cofre de verdade (src-go/secret, o Credential
// Manager/Keychain real) por um mapa em memória — sem isto, rodar
// `go test` leria e escreveria por cima do token de verdade de uma
// instalação já configurada nesta máquina, já que o cofre é um recurso do
// sistema, não um arquivo isolado por teste.
func useFakeVault(testingContext *testing.T) {
	testingContext.Helper()

	fake := map[string]string{}
	previousSave, previousLoad := saveSecret, loadSecret

	saveSecret = func(token string) error {
		fake["token"] = token
		return nil
	}
	loadSecret = func() (string, error) {
		token, found := fake["token"]
		if !found {
			return "", secret.ErrNotFound
		}

		return token, nil
	}

	testingContext.Cleanup(func() {
		saveSecret, loadSecret = previousSave, previousLoad
	})
}

func writeConfigFile(testingContext *testing.T, content string) string {
	testingContext.Helper()

	configPath := filepath.Join(testingContext.TempDir(), "config.json")
	if writeError := os.WriteFile(configPath, []byte(content), 0o600); writeError != nil {
		testingContext.Fatalf("cannot write test file: %v", writeError)
	}

	return configPath
}

func TestLoadFromEnvironment(testingContext *testing.T) {
	// feliz: ambiente completo vira configuração pronta para conectar
	loaded, loadError := Load(environmentOf(map[string]string{
		"ACEROLA_SERVER_URL":              "ws://localhost:3005/agent",
		"ACEROLA_AGENT_TOKEN":             "fixture-token",
		"ACEROLA_REPORT_INTERVAL_SECONDS": "45",
	}), "")
	if loadError != nil {
		testingContext.Fatalf("expected valid configuration, got error: %v", loadError)
	}

	if loaded.ServerURL != "ws://localhost:3005/agent" {
		testingContext.Errorf("unexpected address: %q", loaded.ServerURL)
	}
	if loaded.Token != "fixture-token" {
		testingContext.Errorf("unexpected token: %q", loaded.Token)
	}
	if loaded.Interval != 45*time.Second {
		testingContext.Errorf("unexpected interval: %v", loaded.Interval)
	}
}

func TestSaveThenLoad(testingContext *testing.T) {
	// feliz: o que a tela do agente salvou é o que ele usa para conectar
	useFakeVault(testingContext)
	configPath := filepath.Join(testingContext.TempDir(), "config.json")

	if _, saveError := Save(configPath, "https://painel.exemplo.com", "from-file", 60); saveError != nil {
		testingContext.Fatalf("cannot save: %v", saveError)
	}

	loaded, loadError := Load(environmentOf(nil), configPath)
	if loadError != nil {
		testingContext.Fatalf("expected valid configuration, got error: %v", loadError)
	}

	// O endereço colado do navegador (https) vira wss, com o caminho do gateway.
	if loaded.ServerURL != "wss://painel.exemplo.com/agent" {
		testingContext.Errorf("unexpected address: %q", loaded.ServerURL)
	}
	if loaded.Token != "from-file" {
		testingContext.Errorf("unexpected token: %q", loaded.Token)
	}
}

func TestEnvironmentWinsOverFile(testingContext *testing.T) {
	// feliz: apontar a máquina para outro servidor não exige reescrever o arquivo
	useFakeVault(testingContext)
	configPath := filepath.Join(testingContext.TempDir(), "config.json")
	if _, saveError := Save(configPath, "wss://producao.exemplo.com/agent", "from-file", 0); saveError != nil {
		testingContext.Fatalf("cannot save: %v", saveError)
	}

	loaded, loadError := Load(environmentOf(map[string]string{
		"ACEROLA_SERVER_URL":  "ws://localhost:3005/agent",
		"ACEROLA_AGENT_TOKEN": "from-environment",
	}), configPath)
	if loadError != nil {
		testingContext.Fatalf("expected valid configuration, got error: %v", loadError)
	}

	if loaded.Token != "from-environment" {
		testingContext.Errorf("environment should override file, got %q", loaded.Token)
	}
}

func TestIntervalDefaultsAndBounds(testingContext *testing.T) {
	// feliz: valor ausente, curto demais e longo demais caem na faixa que funciona
	cases := []struct {
		seconds  string
		expected time.Duration
	}{
		{"", DefaultInterval},
		{"0", DefaultInterval},
		{"1", MinInterval},
		{"99999", MaxInterval},
	}

	for _, singleCase := range cases {
		loaded, loadError := Load(environmentOf(map[string]string{
			"ACEROLA_SERVER_URL":              "ws://localhost:3005/agent",
			"ACEROLA_AGENT_TOKEN":             "fixture-token",
			"ACEROLA_REPORT_INTERVAL_SECONDS": singleCase.seconds,
		}), "")
		if loadError != nil {
			testingContext.Fatalf("expected valid configuration for %q, got error: %v", singleCase.seconds, loadError)
		}
		if loaded.Interval != singleCase.expected {
			testingContext.Errorf("for %q expected %v, got %v", singleCase.seconds, singleCase.expected, loaded.Interval)
		}
	}
}

func TestLoadWithoutConfiguration(testingContext *testing.T) {
	// triste: máquina que só usa o agente local não é erro, é "não reportar"
	_, loadError := Load(environmentOf(nil), filepath.Join(testingContext.TempDir(), "missing.json"))

	if !errors.Is(loadError, ErrNotConfigured) {
		testingContext.Errorf("expected ErrNotConfigured, got %v", loadError)
	}
}

func TestLoadRefusesIncompleteConfiguration(testingContext *testing.T) {
	// triste: metade da configuração é engano de instalação, e precisa aparecer
	_, missingToken := Load(environmentOf(map[string]string{
		"ACEROLA_SERVER_URL": "ws://localhost:3005/agent",
	}), "")
	if missingToken == nil || errors.Is(missingToken, ErrNotConfigured) {
		testingContext.Errorf("expected missing token error, got %v", missingToken)
	}

	_, missingURL := Load(environmentOf(map[string]string{
		"ACEROLA_AGENT_TOKEN": "fixture-token",
	}), "")
	if missingURL == nil || errors.Is(missingURL, ErrNotConfigured) {
		testingContext.Errorf("expected missing address error, got %v", missingURL)
	}
}

func TestLoadRefusesUnusableAddress(testingContext *testing.T) {
	// triste: endereço que não dá conexão nenhuma para antes de virar tentativa eterna
	for _, address := range []string{"ftp://painel.exemplo.com", "plain-text", "ws://"} {
		_, loadError := Load(environmentOf(map[string]string{
			"ACEROLA_SERVER_URL":  address,
			"ACEROLA_AGENT_TOKEN": "fixture-token",
		}), "")
		if loadError == nil {
			testingContext.Errorf("expected error for address %q", address)
		}
	}
}

func TestLoadRefusesBrokenFile(testingContext *testing.T) {
	// triste: arquivo corrompido não vira silêncio
	configPath := writeConfigFile(testingContext, "{this is not json")

	_, loadError := Load(environmentOf(nil), configPath)
	if loadError == nil || errors.Is(loadError, ErrNotConfigured) {
		testingContext.Errorf("expected invalid JSON error, got %v", loadError)
	}
}

func TestSaveKeepsTheTokenOutOfTheFile(testingContext *testing.T) {
	// feliz: quem abrir o arquivo no disco não encontra a chave — ela foi para
	// o cofre do sistema, não para o config.json
	useFakeVault(testingContext)
	configPath := filepath.Join(testingContext.TempDir(), "config.json")
	const token = "machine-secret-key"

	if _, saveError := Save(configPath, "http://localhost:3005", token, 0); saveError != nil {
		testingContext.Fatalf("cannot save: %v", saveError)
	}

	content, readError := os.ReadFile(configPath)
	if readError != nil {
		testingContext.Fatalf("cannot read file: %v", readError)
	}

	if strings.Contains(string(content), token) {
		testingContext.Error("key appeared in plaintext in the file")
	}
	if strings.Contains(string(content), "tokenCipher") {
		testingContext.Error("file must not contain a key, even encrypted")
	}

	loaded, loadError := loadSecret()
	if loadError != nil {
		testingContext.Fatalf("cannot read from vault: %v", loadError)
	}
	if loaded != token {
		testingContext.Errorf("expected key in vault, got %q", loaded)
	}
}

func TestCurrentTellsWhatIsConfiguredWithoutTheSecret(testingContext *testing.T) {
	// feliz: a tela sabe o endereço e que existe uma chave — nunca a chave
	useFakeVault(testingContext)
	configPath := filepath.Join(testingContext.TempDir(), "config.json")
	if _, saveError := Save(configPath, "http://localhost:3005", "key", 45); saveError != nil {
		testingContext.Fatalf("cannot save: %v", saveError)
	}

	current := Current(configPath)
	if current.ServerURL != "ws://localhost:3005/agent" {
		testingContext.Errorf("unexpected address: %q", current.ServerURL)
	}
	if !current.HasToken {
		testingContext.Error("should report a saved key")
	}
	if current.IntervalSeconds != 45 {
		testingContext.Errorf("unexpected interval: %d", current.IntervalSeconds)
	}

	// triste: máquina sem configuração nenhuma não inventa endereço nem chave
	empty := Current(filepath.Join(testingContext.TempDir(), "missing.json"))
	if empty.ServerURL != "" || empty.HasToken {
		testingContext.Errorf("expected empty settings, got %+v", empty)
	}
}

func TestSaveRefusesWhatWouldNeverConnect(testingContext *testing.T) {
	// triste: erro de digitação para na hora de salvar, e não depois, calado
	configPath := filepath.Join(testingContext.TempDir(), "config.json")

	if _, saveError := Save(configPath, "http://localhost:3005", "   ", 0); saveError == nil {
		testingContext.Error("expected rejection of blank key")
	}
	if _, saveError := Save(configPath, "ftp://painel", "key", 0); saveError == nil {
		testingContext.Error("expected rejection of invalid address")
	}

	if _, statError := os.Stat(configPath); statError == nil {
		testingContext.Error("nothing should have been written")
	}
}

func TestLoadRefusesASecretFromAnotherMachine(testingContext *testing.T) {
	// triste: arquivo copiado de outro computador não abre — e diz isso. É o
	// mesmo caminho da migração (TestLoadMigratesLegacyTokenToTheVault),
	// batendo no caso em que a cifra antiga não decifra nesta máquina.
	configPath := writeConfigFile(testingContext,
		`{"serverUrl":"http://localhost:3005","tokenCipher":"dGV4dG8gcXVlIG7Do28gYWJyZQ=="}`)

	_, loadError := Load(environmentOf(nil), configPath)
	if loadError == nil || errors.Is(loadError, ErrNotConfigured) {
		testingContext.Errorf("expected unreadable key error, got %v", loadError)
	}
}

func TestLoadMigratesLegacyTokenToTheVault(testingContext *testing.T) {
	// feliz: máquina vinda de uma versão anterior ao cofre — o token sai do
	// arquivo cifrado à moda antiga e vai para o cofre do sistema sozinho,
	// na primeira partida depois da atualização, sem ninguém reconfigurar nada
	useFakeVault(testingContext)

	previousLegacyUnprotect := legacyUnprotect
	legacyUnprotect = func(encoded string) (string, error) {
		if encoded != "legacy-installation-ciphertext" {
			return "", errors.New("unexpected test value")
		}

		return "legacy-installation-token", nil
	}
	testingContext.Cleanup(func() { legacyUnprotect = previousLegacyUnprotect })

	configPath := writeConfigFile(testingContext,
		`{"serverUrl":"http://localhost:3005","tokenCipher":"legacy-installation-ciphertext","intervalSeconds":60}`)

	loaded, loadError := Load(environmentOf(nil), configPath)
	if loadError != nil {
		testingContext.Fatalf("expected silent migration, got error: %v", loadError)
	}
	if loaded.Token != "legacy-installation-token" {
		testingContext.Errorf("unexpected token: %q", loaded.Token)
	}

	vaultToken, vaultError := loadSecret()
	if vaultError != nil || vaultToken != "legacy-installation-token" {
		testingContext.Errorf("expected migrated token in vault, got %q (%v)", vaultToken, vaultError)
	}

	content, readError := os.ReadFile(configPath)
	if readError != nil {
		testingContext.Fatalf("cannot read file: %v", readError)
	}
	if strings.Contains(string(content), "tokenCipher") {
		testingContext.Error("file should no longer contain legacy ciphertext after migration")
	}
}

func TestLoadWhenTheVaultCannotBeRead(testingContext *testing.T) {
	// triste: cofre indisponível (serviço do sistema fora do ar, por exemplo)
	// não deve parecer "máquina não configurada" — é um erro diferente
	configPath := writeConfigFile(testingContext, `{"serverUrl":"http://localhost:3005"}`)

	previousLoadSecret := loadSecret
	loadSecret = func() (string, error) { return "", errors.New("vault unavailable") }
	testingContext.Cleanup(func() { loadSecret = previousLoadSecret })

	_, loadError := Load(environmentOf(nil), configPath)
	if loadError == nil || errors.Is(loadError, ErrNotConfigured) {
		testingContext.Errorf("expected vault unavailable error, got %v", loadError)
	}
}

func TestSaveWhenTheVaultCannotBeWritten(testingContext *testing.T) {
	// triste: cofre indisponível na hora de salvar não grava um config.json
	// pela metade, com endereço mas sem chave nenhuma
	configPath := filepath.Join(testingContext.TempDir(), "config.json")

	previousSaveSecret := saveSecret
	saveSecret = func(string) error { return errors.New("vault unavailable") }
	testingContext.Cleanup(func() { saveSecret = previousSaveSecret })

	if _, saveError := Save(configPath, "http://localhost:3005", "key", 0); saveError == nil {
		testingContext.Error("expected rejection when vault cannot write")
	}
	if _, statError := os.Stat(configPath); statError == nil {
		testingContext.Error("nothing should have been written")
	}
}
