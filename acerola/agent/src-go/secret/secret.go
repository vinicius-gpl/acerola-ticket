// Package secret guarda o token do agente no cofre de credenciais do
// sistema operacional — Credential Manager no Windows, Keychain no macOS,
// Secret Service no Linux — em vez de um arquivo cifrado por conta própria.
//
// A troca existe por dois motivos: o arquivo cifrado (ver legacy_windows.go)
// era SÓ NOSSO — alguém copia a pasta de configuração, leva num backup, e um
// segredo viaja junto sem necessidade; e a cifra antiga só existe no
// Windows, o que travava o agente de sequer compilar em outro sistema.
//
// O cofre é por USUÁRIO do sistema operacional, não por instalação: um
// agente rodando como serviço, sob outra conta, não enxerga o que foi salvo
// pela pessoa logada. Antes de transformar o agente num serviço (ver
// agent/docs/roadmap.md), este desenho precisa ser revisitado junto.
package secret

import (
	"errors"
	"fmt"

	"github.com/zalando/go-keyring"
)

// service e account identificam a entrada no cofre. A conta é fixa porque só
// existe UM token por instalação — não é "qual usuário", é "qual segredo",
// do mesmo jeito que um navegador guarda "a senha do site X".
//
// Em `var`, não `const`, só para o teste deste pacote conseguir trocar a
// conta por uma só dele antes de gravar qualquer coisa — sem isso, rodar
// `go test` escreveria por cima do token de verdade de uma instalação já
// configurada nesta máquina.
var (
	service = "Acerola Agent"
	account = "reporting-token"
)

var errEmpty = errors.New("secret: nothing to save")

// ErrNotFound é devolvido por Load quando não há token guardado — máquina
// nova, ou que nunca chegou a ser configurada.
var ErrNotFound = keyring.ErrNotFound

// Save grava o token no cofre do sistema, sobrescrevendo o que houver.
func Save(token string) error {
	if token == "" {
		return errEmpty
	}

	if saveError := keyring.Set(service, account, token); saveError != nil {
		return fmt.Errorf("secret: cannot save to the system vault: %w", saveError)
	}

	return nil
}

// Load lê o token guardado. Devolve ErrNotFound quando não há nenhum — quem
// chama trata isso como "máquina não configurada", não como falha.
func Load() (string, error) {
	token, loadError := keyring.Get(service, account)
	if loadError != nil {
		if errors.Is(loadError, keyring.ErrNotFound) {
			return "", ErrNotFound
		}

		return "", fmt.Errorf("secret: cannot read the system vault: %w", loadError)
	}

	return token, nil
}
