// Package screen lê a área útil do monitor principal do Windows — a tela
// inteira menos a barra de tarefas (e qualquer outra barra ancorada). O
// Wails não expõe isso: `runtime.ScreenGetAll` só devolve o tamanho total
// da tela, e usar esse valor pra posicionar a popup/dashboard ia colocar a
// janela por baixo da barra de tarefas. Por isso chamamos direto a API do
// Windows (`SystemParametersInfoW` com `SPI_GETWORKAREA`), que é exatamente
// o retângulo que o Explorer usa pra não deixar janelas maximizadas
// cobrirem a barra de tarefas.
package screen

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

const spiGetWorkArea = 0x0030

type rect struct {
	Left, Top, Right, Bottom int32
}

var (
	user32                   = windows.NewLazySystemDLL("user32.dll")
	procSystemParametersInfo = user32.NewProc("SystemParametersInfoW")
)

// WorkArea retorna a área útil do monitor principal (x, y, largura, altura)
// em pixels lógicos. Se a chamada ao Windows falhar por algum motivo,
// retorna um retângulo de fallback razoável em vez de travar o app — errar
// a posição da janela por alguns pixels é bem menos grave que não abrir.
func WorkArea() (x, y, width, height int) {
	var r rect
	ret, _, _ := procSystemParametersInfo.Call(
		spiGetWorkArea,
		0,
		uintptr(unsafe.Pointer(&r)), //nolint:gosec // API do Windows exige ponteiro cru aqui
		0,
	)
	if ret == 0 {
		return 0, 0, 1920, 1040
	}
	return int(r.Left), int(r.Top), int(r.Right - r.Left), int(r.Bottom - r.Top)
}
