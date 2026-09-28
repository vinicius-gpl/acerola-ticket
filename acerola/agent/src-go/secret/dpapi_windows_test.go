package secret

import (
	"encoding/base64"
	"strings"
	"testing"
)

func TestProtectAndUnprotectRoundTrip(testingContext *testing.T) {
	// feliz: o que foi cifrado volta idêntico nesta máquina, para este usuário
	const token = "79N2ec-_eMMppRjjVDgSt8UtYbQUFB-zK4VWNSHAZUQ"

	cipher, protectError := Protect(token)
	if protectError != nil {
		testingContext.Fatalf("não consegui cifrar: %v", protectError)
	}

	if strings.Contains(cipher, token) {
		testingContext.Fatal("o token apareceu em texto puro dentro do valor cifrado")
	}

	plain, unprotectError := Unprotect(cipher)
	if unprotectError != nil {
		testingContext.Fatalf("não consegui decifrar: %v", unprotectError)
	}
	if plain != token {
		testingContext.Errorf("esperava o token de volta, veio %q", plain)
	}
}

func TestProtectProducesDifferentCipherEachTime(testingContext *testing.T) {
	// feliz: dois arquivos com o mesmo token não ficam com o mesmo conteúdo
	first, _ := Protect("mesmo-token")
	second, _ := Protect("mesmo-token")

	if first == second {
		testingContext.Error("o valor cifrado deveria mudar a cada gravação")
	}
}

func TestUnprotectRefusesTamperedValue(testingContext *testing.T) {
	// triste: mexer no arquivo não devolve um token pela metade — não devolve nada
	cipher, protectError := Protect("token-de-teste")
	if protectError != nil {
		testingContext.Fatalf("não consegui cifrar: %v", protectError)
	}

	raw, decodeError := base64.StdEncoding.DecodeString(cipher)
	if decodeError != nil {
		testingContext.Fatalf("valor cifrado ilegível: %v", decodeError)
	}
	raw[len(raw)/2] ^= 0xFF

	if _, unprotectError := Unprotect(base64.StdEncoding.EncodeToString(raw)); unprotectError == nil {
		testingContext.Error("esperava recusa para um valor adulterado")
	}
}

func TestUnprotectRefusesGarbage(testingContext *testing.T) {
	// triste: arquivo com lixo no lugar do segredo
	for _, value := range []string{"", "isto não é base64 !!", base64.StdEncoding.EncodeToString([]byte("qualquer coisa"))} {
		if _, unprotectError := Unprotect(value); unprotectError == nil {
			testingContext.Errorf("esperava recusa para %q", value)
		}
	}
}

func TestProtectRefusesEmpty(testingContext *testing.T) {
	// triste: salvar um token vazio seria desconfigurar a máquina sem querer
	if _, protectError := Protect(""); protectError == nil {
		testingContext.Error("esperava recusa para um segredo vazio")
	}
}
