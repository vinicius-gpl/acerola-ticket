package reporting

import (
	"errors"
	"os"
	"path/filepath"
	"testing"
	"time"
)

// environmentOf devolve um leitor de ambiente feito de um mapa, para o teste
// não depender de variáveis reais da máquina que roda a suíte.
func environmentOf(values map[string]string) Environment {
	return func(key string) string { return values[key] }
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

func TestLoadFromFile(testingContext *testing.T) {
	// feliz: sem ambiente, vale o arquivo que o instalador gravou
	configPath := writeConfigFile(testingContext,
		`{"serverUrl":"https://painel.exemplo.com","token":"do-arquivo","intervalSeconds":60}`)

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
	configPath := writeConfigFile(testingContext,
		`{"serverUrl":"wss://producao.exemplo.com/agent","token":"do-arquivo"}`)

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
