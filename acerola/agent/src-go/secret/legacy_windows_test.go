package secret

import (
	"encoding/base64"
	"testing"

	"golang.org/x/sys/windows"
)

// legacyProtectForTest reproduz a cifra que a versão antiga do agente usava,
// só para o teste ter um valor de "instalação anterior" para decifrar — a
// gravação nesse formato não existe mais no pacote (ver legacy_windows.go).
func legacyProtectForTest(testingContext *testing.T, plain string) string {
	testingContext.Helper()

	entropy, entropyError := legacyMachineEntropy()
	if entropyError != nil {
		testingContext.Fatalf("não consegui montar a entropia: %v", entropyError)
	}

	plainBlob := legacyBlobOf([]byte(plain))
	entropyBlob := legacyBlobOf(entropy)

	var out windows.DataBlob
	if protectError := windows.CryptProtectData(
		&plainBlob, nil, &entropyBlob, 0, nil, windows.CRYPTPROTECT_UI_FORBIDDEN, &out,
	); protectError != nil {
		testingContext.Fatalf("não consegui cifrar para o teste: %v", protectError)
	}

	return base64.StdEncoding.EncodeToString(legacyReadBlob(out))
}

func TestLegacyUnprotectRoundTrip(testingContext *testing.T) {
	// feliz: o que uma instalação antiga cifrou ainda abre nesta máquina
	const token = "79N2ec-_eMMppRjjVDgSt8UtYbQUFB-zK4VWNSHAZUQ"

	cipher := legacyProtectForTest(testingContext, token)

	plain, unprotectError := LegacyUnprotect(cipher)
	if unprotectError != nil {
		testingContext.Fatalf("não consegui decifrar: %v", unprotectError)
	}
	if plain != token {
		testingContext.Errorf("esperava o token de volta, veio %q", plain)
	}
}

func TestLegacyUnprotectRefusesTamperedValue(testingContext *testing.T) {
	// triste: mexer no arquivo não devolve um token pela metade — não devolve nada
	cipher := legacyProtectForTest(testingContext, "token-de-teste")

	raw, decodeError := base64.StdEncoding.DecodeString(cipher)
	if decodeError != nil {
		testingContext.Fatalf("valor cifrado ilegível: %v", decodeError)
	}
	raw[len(raw)/2] ^= 0xFF

	if _, unprotectError := LegacyUnprotect(base64.StdEncoding.EncodeToString(raw)); unprotectError == nil {
		testingContext.Error("esperava recusa para um valor adulterado")
	}
}

func TestLegacyUnprotectRefusesGarbage(testingContext *testing.T) {
	// triste: arquivo com lixo no lugar do segredo
	for _, value := range []string{"", "isto não é base64 !!", base64.StdEncoding.EncodeToString([]byte("qualquer coisa"))} {
		if _, unprotectError := LegacyUnprotect(value); unprotectError == nil {
			testingContext.Errorf("esperava recusa para %q", value)
		}
	}
}
