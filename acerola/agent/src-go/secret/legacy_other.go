//go:build !windows

// Só existe para este pacote compilar fora do Windows: não há cifra antiga
// (DPAPI) para migrar em nenhuma outra plataforma, porque o agente nunca
// rodou nelas antes deste cofre (ver secret.go e legacy_windows.go).
package secret

import "errors"

// LegacyUnprotect nunca é chamada de verdade fora do Windows — não existe
// tokenCipher para migrar num sistema em que o agente nunca rodou com a
// versão antiga. Existe só para reporting/config.go não precisar de código
// específico por plataforma.
func LegacyUnprotect(string) (string, error) {
	return "", errors.New("secret: legacy format is Windows-only")
}
