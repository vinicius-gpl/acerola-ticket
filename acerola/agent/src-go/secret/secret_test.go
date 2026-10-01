package secret

import (
	"errors"
	"testing"

	"github.com/zalando/go-keyring"
)

// useTestAccount troca a conta do cofre por uma só do teste, para rodar
// `go test` não ler nem sobrescrever um token de verdade que porventura já
// esteja guardado nesta máquina por uma instalação configurada do agente.
func useTestAccount(testingContext *testing.T) {
	testingContext.Helper()

	previous := account
	account = "reporting-token-test"

	testingContext.Cleanup(func() {
		_ = keyring.Delete(service, account)
		account = previous
	})
}

func TestSaveThenLoadRoundTrip(testingContext *testing.T) {
	// feliz: o que foi salvo no cofre volta idêntico
	useTestAccount(testingContext)
	const token = "79N2ec-_eMMppRjjVDgSt8UtYbQUFB-zK4VWNSHAZUQ"

	if saveError := Save(token); saveError != nil {
		testingContext.Fatalf("não consegui salvar no cofre: %v", saveError)
	}

	loaded, loadError := Load()
	if loadError != nil {
		testingContext.Fatalf("não consegui ler do cofre: %v", loadError)
	}
	if loaded != token {
		testingContext.Errorf("esperava o token de volta, veio %q", loaded)
	}
}

func TestSaveOverwritesThePreviousToken(testingContext *testing.T) {
	// feliz: reconfigurar a máquina troca o token, não acumula
	useTestAccount(testingContext)

	if saveError := Save("token-antigo"); saveError != nil {
		testingContext.Fatalf("não consegui salvar no cofre: %v", saveError)
	}
	if saveError := Save("token-novo"); saveError != nil {
		testingContext.Fatalf("não consegui sobrescrever no cofre: %v", saveError)
	}

	loaded, loadError := Load()
	if loadError != nil {
		testingContext.Fatalf("não consegui ler do cofre: %v", loadError)
	}
	if loaded != "token-novo" {
		testingContext.Errorf("esperava o token mais recente, veio %q", loaded)
	}
}

func TestLoadRefusesWhenNothingIsSaved(testingContext *testing.T) {
	// triste: máquina nova, sem token guardado — não é erro, é "não configurada"
	useTestAccount(testingContext)

	if _, loadError := Load(); !errors.Is(loadError, ErrNotFound) {
		testingContext.Errorf("esperava ErrNotFound, veio %v", loadError)
	}
}

func TestSaveRefusesEmpty(testingContext *testing.T) {
	// triste: salvar um token vazio seria desconfigurar a máquina sem querer
	useTestAccount(testingContext)

	if saveError := Save(""); saveError == nil {
		testingContext.Error("esperava recusa para um segredo vazio")
	}
}
