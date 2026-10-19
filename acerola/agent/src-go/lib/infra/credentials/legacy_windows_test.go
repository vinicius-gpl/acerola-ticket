package credentials

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
		testingContext.Fatalf("cannot build entropy: %v", entropyError)
	}

	plainBlob := legacyBlobOf([]byte(plain))
	entropyBlob := legacyBlobOf(entropy)

	var out windows.DataBlob
	if protectError := windows.CryptProtectData(
		&plainBlob, nil, &entropyBlob, 0, nil, windows.CRYPTPROTECT_UI_FORBIDDEN, &out,
	); protectError != nil {
		testingContext.Fatalf("cannot encrypt test value: %v", protectError)
	}

	return base64.StdEncoding.EncodeToString(legacyReadBlob(out))
}

func TestLegacyUnprotectRoundTrip(testingContext *testing.T) {
	// feliz: o que uma instalação antiga cifrou ainda abre nesta máquina
	const token = "79N2ec-_eMMppRjjVDgSt8UtYbQUFB-zK4VWNSHAZUQ"

	cipher := legacyProtectForTest(testingContext, token)

	plain, unprotectError := LegacyUnprotect(cipher)
	if unprotectError != nil {
		testingContext.Fatalf("cannot decrypt: %v", unprotectError)
	}
	if plain != token {
		testingContext.Errorf("expected original token, got %q", plain)
	}
}

func TestLegacyUnprotectRefusesTamperedValue(testingContext *testing.T) {
	// triste: mexer no arquivo não devolve um token pela metade — não devolve nada
	cipher := legacyProtectForTest(testingContext, "fixture-token")

	raw, decodeError := base64.StdEncoding.DecodeString(cipher)
	if decodeError != nil {
		testingContext.Fatalf("unreadable ciphertext: %v", decodeError)
	}
	raw[len(raw)/2] ^= 0xFF

	if _, unprotectError := LegacyUnprotect(base64.StdEncoding.EncodeToString(raw)); unprotectError == nil {
		testingContext.Error("expected rejection of tampered value")
	}
}

func TestLegacyUnprotectRefusesGarbage(testingContext *testing.T) {
	// triste: arquivo com lixo no lugar do segredo
	for _, value := range []string{"", "this is not base64 !!", base64.StdEncoding.EncodeToString([]byte("anything"))} {
		if _, unprotectError := LegacyUnprotect(value); unprotectError == nil {
			testingContext.Errorf("expected rejection of %q", value)
		}
	}
}
