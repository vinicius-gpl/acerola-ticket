//go:build !windows

package memory

import "testing"

func TestTrimWorkingSetHappyPath(testingContext *testing.T) {
	// feliz: chamada não deve entrar em pânico nem travar a execução
	TrimWorkingSet()
}

func TestTrimWorkingSetRepeatedCalls(testingContext *testing.T) {
	// triste: chamar de novo sem nada para liberar não pode falhar (caso limite)
	TrimWorkingSet()
	TrimWorkingSet()
}
