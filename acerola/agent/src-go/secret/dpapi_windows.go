// Package secret guarda um segredo em disco de um jeito que o próprio disco
// não entrega: cifra com a DPAPI do Windows, somando uma entropia da máquina.
//
// A DPAPI não tem chave para guardar em lugar nenhum — quem guarda é o
// Windows, amarrada à conta do usuário que cifrou. Na prática:
//
//   - copiar o arquivo para outro computador não adianta;
//   - outro usuário do MESMO computador também não abre;
//   - e a entropia extra faz com que nem outro programa rodando como o mesmo
//     usuário consiga decifrar sem conhecê-la.
//
// É o mecanismo que o próprio Windows usa para as senhas salvas do navegador.
package secret

import (
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

// A entropia extra do agente. O texto fixo separa este segredo de qualquer
// outro cifrado pelo mesmo usuário; o identificador da máquina prende o
// resultado a este computador.
const entropySalt = "acerola-agent/reporting-token/v1"

// Onde o Windows guarda o identificador desta instalação. É o mesmo valor que
// não muda com troca de nome da máquina nem de placa de rede.
const (
	machineGuidKey   = `SOFTWARE\Microsoft\Cryptography`
	machineGuidValue = "MachineGuid"
)

var errEmpty = errors.New("secret: nothing to protect")

// Protect cifra o texto e devolve em base64, pronto para ir a um arquivo JSON.
func Protect(plain string) (string, error) {
	if plain == "" {
		return "", errEmpty
	}

	entropy, entropyError := machineEntropy()
	if entropyError != nil {
		return "", entropyError
	}

	plainBlob := blobOf([]byte(plain))
	entropyBlob := blobOf(entropy)

	var out windows.DataBlob
	if protectError := windows.CryptProtectData(
		&plainBlob, nil, &entropyBlob, 0, nil, windows.CRYPTPROTECT_UI_FORBIDDEN, &out,
	); protectError != nil {
		return "", fmt.Errorf("secret: cannot protect: %w", protectError)
	}

	return base64.StdEncoding.EncodeToString(readBlob(out)), nil
}

// Unprotect desfaz o Protect. Devolve erro quando o segredo foi cifrado por
// outro usuário, em outra máquina, ou quando o arquivo foi adulterado — que
// são exatamente os casos em que ele NÃO deve abrir.
func Unprotect(encoded string) (string, error) {
	if encoded == "" {
		return "", errEmpty
	}

	cipher, decodeError := base64.StdEncoding.DecodeString(encoded)
	if decodeError != nil {
		return "", fmt.Errorf("secret: stored value is not base64: %w", decodeError)
	}

	entropy, entropyError := machineEntropy()
	if entropyError != nil {
		return "", entropyError
	}

	cipherBlob := blobOf(cipher)
	entropyBlob := blobOf(entropy)

	var out windows.DataBlob
	if unprotectError := windows.CryptUnprotectData(
		&cipherBlob, nil, &entropyBlob, 0, nil, windows.CRYPTPROTECT_UI_FORBIDDEN, &out,
	); unprotectError != nil {
		return "", fmt.Errorf("secret: cannot unprotect: %w", unprotectError)
	}

	return string(readBlob(out)), nil
}

// machineEntropy mistura o sal fixo com o identificador desta instalação do
// Windows. O resumo tem tamanho fixo e não devolve o identificador a ninguém.
func machineEntropy() ([]byte, error) {
	identifier, identifierError := machineIdentifier()
	if identifierError != nil {
		return nil, identifierError
	}

	sum := sha256.Sum256([]byte(entropySalt + "/" + identifier))

	return sum[:], nil
}

func machineIdentifier() (string, error) {
	key, openError := registry.OpenKey(registry.LOCAL_MACHINE, machineGuidKey, registry.QUERY_VALUE)
	if openError == nil {
		defer func() { _ = key.Close() }()

		if guid, _, readError := key.GetStringValue(machineGuidValue); readError == nil && guid != "" {
			return guid, nil
		}
	}

	/* Sem o identificador do Windows, o nome da máquina ainda prende o segredo
	   a este computador. Vale menos, e é melhor do que não somar nada. */
	name, nameError := windows.ComputerName()
	if nameError != nil {
		return "", fmt.Errorf("secret: cannot identify this machine: %w", nameError)
	}

	return name, nil
}

func blobOf(data []byte) windows.DataBlob {
	if len(data) == 0 {
		return windows.DataBlob{}
	}

	return windows.DataBlob{Size: uint32(len(data)), Data: &data[0]}
}

// readBlob copia o resultado para memória do Go e devolve a original ao
// Windows — a API aloca com LocalAlloc, e não liberar vaza a cada gravação.
func readBlob(blob windows.DataBlob) []byte {
	defer func() { _, _ = windows.LocalFree(windows.Handle(unsafe.Pointer(blob.Data))) }()

	return append([]byte(nil), unsafe.Slice(blob.Data, blob.Size)...)
}
