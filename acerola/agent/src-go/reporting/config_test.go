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
		testingContext.Fatalf("não consegui escrever o arquivo de teste: %v", writeError)
	}

	return configPath
}

func TestLoadFromEnvironment(testingContext *testing.T) {
	// feliz: ambiente completo vira configuração pronta para conectar
	loaded, loadError := Load(environmentOf(map[string]string{
		"ACEROLA_SERVER_URL":              "ws://localhost:3005/agent",
		"ACEROLA_AGENT_TOKEN":             "token-de-teste",
		"ACEROLA_REPORT_INTERVAL_SECONDS": "45",
	}), "")
	if loadError != nil {
		testingContext.Fatalf("esperava configuração válida, veio erro: %v", loadError)
	}

	if loaded.ServerURL != "ws://localhost:3005/agent" {
		testingContext.Errorf("endereço inesperado: %q", loaded.ServerURL)
	}
	if loaded.Token != "token-de-teste" {
		testingContext.Errorf("token inesperado: %q", loaded.Token)
	}
	if loaded.Interval != 45*time.Second {
		testingContext.Errorf("intervalo inesperado: %v", loaded.Interval)
	}
}

func TestSaveThenLoad(testingContext *testing.T) {
	// feliz: o que a tela do agente salvou é o que ele usa para conectar
	useFakeVault(testingContext)
	configPath := filepath.Join(testingContext.TempDir(), "config.json")

	if _, saveError := Save(configPath, "https://painel.exemplo.com", "do-arquivo", 60); saveError != nil {
		testingContext.Fatalf("não consegui salvar: %v", saveError)
	}

	loaded, loadError := Load(environmentOf(nil), configPath)
	if loadError != nil {
		testingContext.Fatalf("esperava configuração válida, veio erro: %v", loadError)
	}

	// O endereço colado do navegador (https) vira wss, com o caminho do gateway.
	if loaded.ServerURL != "wss://painel.exemplo.com/agent" {
		testingContext.Errorf("endereço inesperado: %q", loaded.ServerURL)
	}
	if loaded.Token != "do-arquivo" {
		testingContext.Errorf("token inesperado: %q", loaded.Token)
	}
}

func TestEnvironmentWinsOverFile(testingContext *testing.T) {
	// feliz: apontar a máquina para outro servidor não exige reescrever o arquivo
	useFakeVault(testingContext)
	configPath := filepath.Join(testingContext.TempDir(), "config.json")
	if _, saveError := Save(configPath, "wss://producao.exemplo.com/agent", "do-arquivo", 0); saveError != nil {
		testingContext.Fatalf("não consegui salvar: %v", saveError)
	}

	loaded, loadError := Load(environmentOf(map[string]string{
		"ACEROLA_SERVER_URL":  "ws://localhost:3005/agent",
		"ACEROLA_AGENT_TOKEN": "do-ambiente",
	}), configPath)
	if loadError != nil {
		testingContext.Fatalf("esperava configuração válida, veio erro: %v", loadError)
	}

	if loaded.Token != "do-ambiente" {
		testingContext.Errorf("o ambiente deveria vencer o arquivo, veio %q", loaded.Token)
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
			"ACEROLA_AGENT_TOKEN":             "token-de-teste",
			"ACEROLA_REPORT_INTERVAL_SECONDS": singleCase.seconds,
		}), "")
		if loadError != nil {
			testingContext.Fatalf("esperava configuração válida para %q, veio erro: %v", singleCase.seconds, loadError)
		}
		if loaded.Interval != singleCase.expected {
			testingContext.Errorf("para %q esperava %v, veio %v", singleCase.seconds, singleCase.expected, loaded.Interval)
		}
	}
}

func TestLoadWithoutConfiguration(testingContext *testing.T) {
	// triste: máquina que só usa o agente local não é erro, é "não reportar"
	_, loadError := Load(environmentOf(nil), filepath.Join(testingContext.TempDir(), "nao-existe.json"))

	if !errors.Is(loadError, ErrNotConfigured) {
		testingContext.Errorf("esperava ErrNotConfigured, veio %v", loadError)
	}
}

func TestLoadRefusesIncompleteConfiguration(testingContext *testing.T) {
	// triste: metade da configuração é engano de instalação, e precisa aparecer
	_, missingToken := Load(environmentOf(map[string]string{
		"ACEROLA_SERVER_URL": "ws://localhost:3005/agent",
	}), "")
	if missingToken == nil || errors.Is(missingToken, ErrNotConfigured) {
		testingContext.Errorf("esperava erro de token faltando, veio %v", missingToken)
	}

	_, missingURL := Load(environmentOf(map[string]string{
		"ACEROLA_AGENT_TOKEN": "token-de-teste",
	}), "")
	if missingURL == nil || errors.Is(missingURL, ErrNotConfigured) {
		testingContext.Errorf("esperava erro de endereço faltando, veio %v", missingURL)
	}
}

func TestLoadRefusesUnusableAddress(testingContext *testing.T) {
	// triste: endereço que não dá conexão nenhuma para antes de virar tentativa eterna
	for _, address := range []string{"ftp://painel.exemplo.com", "so-um-texto", "ws://"} {
		_, loadError := Load(environmentOf(map[string]string{
			"ACEROLA_SERVER_URL":  address,
			"ACEROLA_AGENT_TOKEN": "token-de-teste",
		}), "")
		if loadError == nil {
			testingContext.Errorf("esperava erro para o endereço %q", address)
		}
	}
}

func TestLoadRefusesBrokenFile(testingContext *testing.T) {
	// triste: arquivo corrompido não vira silêncio
	configPath := writeConfigFile(testingContext, "{isto não é json")

	_, loadError := Load(environmentOf(nil), configPath)
	if loadError == nil || errors.Is(loadError, ErrNotConfigured) {
		testingContext.Errorf("esperava erro de JSON inválido, veio %v", loadError)
	}
}

func TestSaveKeepsTheTokenOutOfTheFile(testingContext *testing.T) {
	// feliz: quem abrir o arquivo no disco não encontra a chave — ela foi para
	// o cofre do sistema, não para o config.json
	useFakeVault(testingContext)
	configPath := filepath.Join(testingContext.TempDir(), "config.json")
	const token = "chave-secreta-da-maquina"

	if _, saveError := Save(configPath, "http://localhost:3005", token, 0); saveError != nil {
		testingContext.Fatalf("não consegui salvar: %v", saveError)
	}

	content, readError := os.ReadFile(configPath)
	if readError != nil {
		testingContext.Fatalf("não consegui ler o arquivo: %v", readError)
	}

	if strings.Contains(string(content), token) {
		testingContext.Error("a chave apareceu em texto puro no arquivo")
	}
	if strings.Contains(string(content), "tokenCipher") {
		testingContext.Error("o arquivo não deveria guardar chave nenhuma, nem cifrada")
	}

	loaded, loadError := loadSecret()
	if loadError != nil {
		testingContext.Fatalf("não consegui ler do cofre: %v", loadError)
	}
	if loaded != token {
		testingContext.Errorf("esperava a chave no cofre, veio %q", loaded)
	}
}

func TestCurrentTellsWhatIsConfiguredWithoutTheSecret(testingContext *testing.T) {
	// feliz: a tela sabe o endereço e que existe uma chave — nunca a chave
	useFakeVault(testingContext)
	configPath := filepath.Join(testingContext.TempDir(), "config.json")
	if _, saveError := Save(configPath, "http://localhost:3005", "chave", 45); saveError != nil {
		testingContext.Fatalf("não consegui salvar: %v", saveError)
	}

	current := Current(configPath)
	if current.ServerURL != "ws://localhost:3005/agent" {
		testingContext.Errorf("endereço inesperado: %q", current.ServerURL)
	}
	if !current.HasToken {
		testingContext.Error("deveria dizer que existe uma chave salva")
	}
	if current.IntervalSeconds != 45 {
		testingContext.Errorf("intervalo inesperado: %d", current.IntervalSeconds)
	}

	// triste: máquina sem configuração nenhuma não inventa endereço nem chave
	empty := Current(filepath.Join(testingContext.TempDir(), "nao-existe.json"))
	if empty.ServerURL != "" || empty.HasToken {
		testingContext.Errorf("esperava vazio, veio %+v", empty)
	}
}

func TestSaveRefusesWhatWouldNeverConnect(testingContext *testing.T) {
	// triste: erro de digitação para na hora de salvar, e não depois, calado
	configPath := filepath.Join(testingContext.TempDir(), "config.json")

	if _, saveError := Save(configPath, "http://localhost:3005", "   ", 0); saveError == nil {
		testingContext.Error("esperava recusa para uma chave em branco")
	}
	if _, saveError := Save(configPath, "ftp://painel", "chave", 0); saveError == nil {
		testingContext.Error("esperava recusa para um endereço impossível")
	}

	if _, statError := os.Stat(configPath); statError == nil {
		testingContext.Error("nada deveria ter sido gravado")
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
		testingContext.Errorf("esperava erro de chave ilegível, veio %v", loadError)
	}
}

func TestLoadMigratesLegacyTokenToTheVault(testingContext *testing.T) {
	// feliz: máquina vinda de uma versão anterior ao cofre — o token sai do
	// arquivo cifrado à moda antiga e vai para o cofre do sistema sozinho,
	// na primeira partida depois da atualização, sem ninguém reconfigurar nada
	useFakeVault(testingContext)

	previousLegacyUnprotect := legacyUnprotect
	legacyUnprotect = func(encoded string) (string, error) {
		if encoded != "cifra-de-uma-instalacao-antiga" {
			return "", errors.New("valor inesperado para o teste")
		}

		return "token-da-instalacao-antiga", nil
	}
	testingContext.Cleanup(func() { legacyUnprotect = previousLegacyUnprotect })

	configPath := writeConfigFile(testingContext,
		`{"serverUrl":"http://localhost:3005","tokenCipher":"cifra-de-uma-instalacao-antiga","intervalSeconds":60}`)

	loaded, loadError := Load(environmentOf(nil), configPath)
	if loadError != nil {
		testingContext.Fatalf("esperava migração silenciosa, veio erro: %v", loadError)
	}
	if loaded.Token != "token-da-instalacao-antiga" {
		testingContext.Errorf("token inesperado: %q", loaded.Token)
	}

	vaultToken, vaultError := loadSecret()
	if vaultError != nil || vaultToken != "token-da-instalacao-antiga" {
		testingContext.Errorf("esperava o token migrado no cofre, veio %q (%v)", vaultToken, vaultError)
	}

	content, readError := os.ReadFile(configPath)
	if readError != nil {
		testingContext.Fatalf("não consegui ler o arquivo: %v", readError)
	}
	if strings.Contains(string(content), "tokenCipher") {
		testingContext.Error("o arquivo deveria ter perdido a cifra antiga depois da migração")
	}
}

func TestLoadWhenTheVaultCannotBeRead(testingContext *testing.T) {
	// triste: cofre indisponível (serviço do sistema fora do ar, por exemplo)
	// não deve parecer "máquina não configurada" — é um erro diferente
	configPath := writeConfigFile(testingContext, `{"serverUrl":"http://localhost:3005"}`)

	previousLoadSecret := loadSecret
	loadSecret = func() (string, error) { return "", errors.New("cofre indisponível") }
	testingContext.Cleanup(func() { loadSecret = previousLoadSecret })

	_, loadError := Load(environmentOf(nil), configPath)
	if loadError == nil || errors.Is(loadError, ErrNotConfigured) {
		testingContext.Errorf("esperava erro de cofre indisponível, veio %v", loadError)
	}
}

func TestSaveWhenTheVaultCannotBeWritten(testingContext *testing.T) {
	// triste: cofre indisponível na hora de salvar não grava um config.json
	// pela metade, com endereço mas sem chave nenhuma
	configPath := filepath.Join(testingContext.TempDir(), "config.json")

	previousSaveSecret := saveSecret
	saveSecret = func(string) error { return errors.New("cofre indisponível") }
	testingContext.Cleanup(func() { saveSecret = previousSaveSecret })

	if _, saveError := Save(configPath, "http://localhost:3005", "chave", 0); saveError == nil {
		testingContext.Error("esperava recusa quando o cofre não grava")
	}
	if _, statError := os.Stat(configPath); statError == nil {
		testingContext.Error("nada deveria ter sido gravado")
	}
}
