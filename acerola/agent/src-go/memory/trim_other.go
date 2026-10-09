//go:build !windows

// Package memory gerencia a pegada de memória física (RAM) do agente. Fora do
// Windows não existe o EmptyWorkingSet nem os subprocessos do WebView2 (ver
// trim_windows.go): só o coletor de lixo do Go tem o que devolver.
package memory

import "runtime/debug"

// TrimWorkingSet pede ao coletor de lixo do Go que devolva ao sistema
// operacional a memória que não está mais em uso.
func TrimWorkingSet() {
	debug.FreeOSMemory()
}
