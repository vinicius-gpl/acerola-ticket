// Package memory gerencia a pegada de memória física (RAM) do agente e dos
// subprocessos filhos do WebView2 no Windows.
package memory

import (
	"os"
	"runtime/debug"
	"unsafe"

	"golang.org/x/sys/windows"
)

var (
	psapiDll            = windows.NewLazySystemDLL("psapi.dll")
	procEmptyWorkingSet = psapiDll.NewProc("EmptyWorkingSet")
)

// TrimWorkingSet solicita ao coletor de lixo do Go e ao Windows a liberação de
// páginas de memória física em standby de volta para o sistema operacional,
// aplicando a otimização tanto no processo atual quanto nos subprocessos filhos
// (instâncias do msedgewebview2.exe).
func TrimWorkingSet() {
	debug.FreeOSMemory()

	_, _, _ = procEmptyWorkingSet.Call(uintptr(windows.CurrentProcess()))

	trimChildProcesses(uint32(os.Getpid()))
}

func trimChildProcesses(parentProcessID uint32) {
	snapshotHandle, snapshotError := windows.CreateToolhelp32Snapshot(windows.TH32CS_SNAPPROCESS, 0)
	if snapshotError != nil {
		return
	}
	defer func() { _ = windows.CloseHandle(snapshotHandle) }()

	var processEntry windows.ProcessEntry32
	processEntry.Size = uint32(unsafe.Sizeof(processEntry))

	iterationError := windows.Process32First(snapshotHandle, &processEntry)
	for iterationError == nil {
		if processEntry.ParentProcessID == parentProcessID {
			childHandle, openError := windows.OpenProcess(
				windows.PROCESS_SET_QUOTA|windows.PROCESS_QUERY_INFORMATION,
				false,
				processEntry.ProcessID,
			)
			if openError == nil {
				_, _, _ = procEmptyWorkingSet.Call(uintptr(childHandle))
				_ = windows.CloseHandle(childHandle)
			}
		}
		iterationError = windows.Process32Next(snapshotHandle, &processEntry)
	}
}
