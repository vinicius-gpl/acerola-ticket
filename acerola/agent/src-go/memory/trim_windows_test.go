package memory

import "testing"

func TestTrimWorkingSetHappyPath(testingContext *testing.T) {
	// feliz: chamada não deve entrar em pânico nem travar a execução
	TrimWorkingSet()
}

func TestTrimChildProcessesInvalidParentID(testingContext *testing.T) {
	// triste: PID pai inexistente deve retornar silenciosamente sem falha
	const nonExistentPID = 99999999
	trimChildProcesses(nonExistentPID)
}
