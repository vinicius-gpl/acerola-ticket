// A cifra que o agente usava ANTES do cofre do sistema (ver secret.go): a
// DPAPI do Windows, somando uma entropia derivada do MachineGuid da máquina.
//
// Só sobrevive aqui para LER o que uma instalação antiga gravou, na primeira
// partida depois da atualização — LegacyUnprotect. Nada volta a gravar neste
// formato; a migração em si mora em reporting/config.go, na função
// migrateLegacyToken.
package secret

import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"unsafe"

	"golang.org/x/sys/windows"
	"golang.org/x/sys/windows/registry"
)

// A mesma entropia extra de sempre: o texto fixo separa este segredo de
// qualquer outro cifrado pelo mesmo usuário; o identificador da máquina
// prende o resultado a este computador.
const legacyEntropySalt = "acerola-agent/reporting-token/v1"

// Onde o Windows guarda o identificador desta instalação. É o mesmo valor
// que não muda com troca de nome da máquina nem de placa de rede.
const (
	legacyMachineGuidKey   = `SOFTWARE\Microsoft\Cryptography`
	legacyMachineGuidValue = "MachineGuid"
)

// LegacyUnprotect desfaz a cifra de uma instalação anterior a este cofre.
// Devolve erro quando o segredo foi cifrado por outro usuário, em outra
// máquina, ou quando o arquivo foi adulterado — que são exatamente os casos
// em que ele NÃO deve abrir.
func LegacyUnprotect(encoded string) (string, error) {
	if encoded == "" {
		return "", errEmpty
	}

	cipher, decodeError := base64.StdEncoding.DecodeString(encoded)
	if decodeError != nil {
		return "", fmt.Errorf("secret: stored value is not base64: %w", decodeError)
	}

	entropy, entropyError := legacyMachineEntropy()
	if entropyError != nil {
		return "", entropyError
	}

	cipherBlob := legacyBlobOf(cipher)
	entropyBlob := legacyBlobOf(entropy)

	var out windows.DataBlob
	if unprotectError := windows.CryptUnprotectData(
		&cipherBlob, nil, &entropyBlob, 0, nil, windows.CRYPTPROTECT_UI_FORBIDDEN, &out,
	); unprotectError != nil {
		return "", fmt.Errorf("secret: cannot unprotect: %w", unprotectError)
	}

	return string(legacyReadBlob(out)), nil
}

// legacyMachineEntropy mistura o sal fixo com o identificador desta
// instalação do Windows. O resumo tem tamanho fixo e não devolve o
// identificador a ninguém.
func legacyMachineEntropy() ([]byte, error) {
	identifier, identifierError := legacyMachineIdentifier()
	if identifierError != nil {
		return nil, identifierError
	}

	sum := sha256.Sum256([]byte(legacyEntropySalt + "/" + identifier))

	return sum[:], nil
}

func legacyMachineIdentifier() (string, error) {
	key, openError := registry.OpenKey(registry.LOCAL_MACHINE, legacyMachineGuidKey, registry.QUERY_VALUE)
	if openError == nil {
		defer func() { _ = key.Close() }()

		if guid, _, readError := key.GetStringValue(legacyMachineGuidValue); readError == nil && guid != "" {
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

func legacyBlobOf(data []byte) windows.DataBlob {
	if len(data) == 0 {
		return windows.DataBlob{}
	}

	return windows.DataBlob{Size: uint32(len(data)), Data: &data[0]}
}

// legacyReadBlob copia o resultado para memória do Go e devolve a original
// ao Windows — a API aloca com LocalAlloc, e não liberar vaza a cada leitura.
func legacyReadBlob(blob windows.DataBlob) []byte {
	defer func() { _, _ = windows.LocalFree(windows.Handle(unsafe.Pointer(blob.Data))) }()

	return append([]byte(nil), unsafe.Slice(blob.Data, blob.Size)...)
}
