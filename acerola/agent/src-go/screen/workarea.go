// Package screen lê a área útil dos monitores do Windows — a tela inteira
// menos a barra de tarefas (e qualquer outra barra ancorada). O Wails não
// expõe isso: `runtime.ScreenGetAll` só devolve o tamanho total da tela, e
// usar esse valor pra posicionar a popup/dashboard ia colocar a janela por
// baixo da barra de tarefas.
//
// Com mais de um monitor não basta perguntar pelo monitor principal
// (`SPI_GETWORKAREA`, que é o que este pacote fazia antes): o painel
// precisa nascer onde a pessoa está trabalhando. Por isso partimos da
// janela em primeiro plano e descobrimos em que monitor ela está
// (`MonitorFromWindow` + `GetMonitorInfoW`), caindo no monitor sob o cursor
// e depois no principal quando não há janela ativa que sirva de pista.
package screen

import (
	"unsafe"

	"golang.org/x/sys/windows"
)

const (
	spiGetWorkArea = 0x0030

	// Se o ponto/retângulo consultado não cair em nenhum monitor, devolve o
	// monitor mais próximo (NEAREST) ou o principal (PRIMARY).
	monitorDefaultToPrimary = 0x00000001
	monitorDefaultToNearest = 0x00000002

	// MDT_EFFECTIVE_DPI: o DPI que o usuário escolheu nas configurações de
	// tela, já com o zoom aplicado — é o que interessa pra dimensionar
	// janela.
	mdtEffectiveDPI = 0

	// 96 é o DPI de referência do Windows: 100% de zoom.
	referenceDPI = 96

	fallbackWidth  = 1920
	fallbackHeight = 1040
)

type rect struct {
	Left, Top, Right, Bottom int32
}

type point struct {
	X, Y int32
}

// monitorInfo espelha a struct MONITORINFO da API do Windows — a ordem e o
// tamanho dos campos precisam bater exatamente com os do C.
type monitorInfo struct {
	CbSize    uint32
	RcMonitor rect
	RcWork    rect
	DwFlags   uint32
}

// Area é o retângulo útil de um monitor em pixels físicos e coordenadas
// absolutas da área de trabalho: com dois monitores lado a lado, o da
// direita começa onde o da esquerda termina (X = 1920, por exemplo), e um
// monitor à esquerda do principal tem X negativo.
type Area struct {
	X, Y, Width, Height int

	// Scale é o zoom configurado naquele monitor (1 = 100%, 1.5 = 150%).
	// Cada tela pode ter o seu — um notebook a 150% ligado a um monitor
	// externo a 100% é comum — então tamanho escrito em pixel lógico (o
	// número que o CSS enxerga) precisa ser multiplicado por este fator
	// antes de virar pixel físico.
	Scale float64
}

var (
	user32 = windows.NewLazySystemDLL("user32.dll")
	shcore = windows.NewLazySystemDLL("shcore.dll")

	procSystemParametersInfo     = user32.NewProc("SystemParametersInfoW")
	procGetForegroundWindow      = user32.NewProc("GetForegroundWindow")
	procGetWindowThreadProcessID = user32.NewProc("GetWindowThreadProcessId")
	procMonitorFromWindow        = user32.NewProc("MonitorFromWindow")
	procMonitorFromRect          = user32.NewProc("MonitorFromRect")
	procGetMonitorInfo           = user32.NewProc("GetMonitorInfoW")
	procGetCursorPos             = user32.NewProc("GetCursorPos")
	procGetDpiForMonitor         = shcore.NewProc("GetDpiForMonitor")
)

// ActiveArea devolve a área útil do monitor onde está a janela em primeiro
// plano — é ali que a pessoa está trabalhando, e é ali que o painel deve
// aparecer. Quando a janela ativa é do próprio agente (ela pode ter ficado
// no monitor da última vez, o que não diz nada sobre onde a pessoa está),
// usamos o monitor sob o cursor; e se nem isso funcionar, o principal.
func ActiveArea() Area {
	if handle := foregroundWindowOfAnotherProcess(); handle != 0 {
		if area, found := areaOfMonitor(monitorFromWindow(handle)); found {
			return area
		}
	}

	if area, found := areaOfMonitor(monitorUnderCursor()); found {
		return area
	}

	return primaryArea()
}

// foregroundWindowOfAnotherProcess devolve a janela em primeiro plano, ou 0
// se ela for do próprio agente (ou se não houver nenhuma).
func foregroundWindowOfAnotherProcess() uintptr {
	handle, _, _ := procGetForegroundWindow.Call()
	if handle == 0 {
		return 0
	}

	var owningProcess uint32
	_, _, _ = procGetWindowThreadProcessID.Call(handle, uintptr(unsafe.Pointer(&owningProcess))) //nolint:gosec // API do Windows exige ponteiro cru aqui
	if owningProcess == windows.GetCurrentProcessId() {
		return 0
	}

	return handle
}

func monitorFromWindow(handle uintptr) uintptr {
	monitor, _, _ := procMonitorFromWindow.Call(handle, monitorDefaultToNearest)
	return monitor
}

// monitorUnderCursor usa MonitorFromRect (e não MonitorFromPoint) de
// propósito: MonitorFromPoint recebe o POINT por valor, o que obrigaria a
// empacotar dois int32 num único uintptr na mão. Com um retângulo de 1x1 em
// volta do cursor o resultado é o mesmo e passamos um ponteiro normal.
func monitorUnderCursor() uintptr {
	var cursor point
	if result, _, _ := procGetCursorPos.Call(uintptr(unsafe.Pointer(&cursor))); result == 0 { //nolint:gosec // API do Windows exige ponteiro cru aqui
		return 0
	}

	cursorBox := rect{Left: cursor.X, Top: cursor.Y, Right: cursor.X + 1, Bottom: cursor.Y + 1}
	monitor, _, _ := procMonitorFromRect.Call(uintptr(unsafe.Pointer(&cursorBox)), monitorDefaultToPrimary) //nolint:gosec // API do Windows exige ponteiro cru aqui
	return monitor
}

// areaOfMonitor lê a área útil de um monitor já identificado. O segundo
// retorno é falso quando o monitor não existe ou o Windows recusou a
// consulta — quem chama decide o que fazer.
func areaOfMonitor(monitor uintptr) (Area, bool) {
	if monitor == 0 {
		return Area{}, false
	}

	var info monitorInfo
	info.CbSize = uint32(unsafe.Sizeof(info))
	if result, _, _ := procGetMonitorInfo.Call(monitor, uintptr(unsafe.Pointer(&info))); result == 0 { //nolint:gosec // API do Windows exige ponteiro cru aqui
		return Area{}, false
	}

	return areaFromRect(info.RcWork, scaleOfMonitor(monitor)), true
}

func areaFromRect(box rect, scale float64) Area {
	return Area{
		X:      int(box.Left),
		Y:      int(box.Top),
		Width:  int(box.Right - box.Left),
		Height: int(box.Bottom - box.Top),
		Scale:  scale,
	}
}

// scaleOfMonitor lê o zoom daquele monitor. GetDpiForMonitor devolve S_OK
// (zero) quando dá certo; em qualquer outro caso ficamos com 100%, que é o
// certo na maioria das máquinas.
func scaleOfMonitor(monitor uintptr) float64 {
	var dpiHorizontal, dpiVertical uint32
	result, _, _ := procGetDpiForMonitor.Call(
		monitor,
		mdtEffectiveDPI,
		uintptr(unsafe.Pointer(&dpiHorizontal)), //nolint:gosec // API do Windows exige ponteiro cru aqui
		uintptr(unsafe.Pointer(&dpiVertical)),   //nolint:gosec // API do Windows exige ponteiro cru aqui
	)
	if result != 0 || dpiHorizontal == 0 {
		return 1
	}

	return float64(dpiHorizontal) / referenceDPI
}

// primaryArea é o último recurso: a área útil do monitor principal. Se nem
// essa chamada funcionar, devolve um retângulo plausível em vez de travar o
// app — errar a posição da janela por alguns pixels é bem menos grave que
// não abrir.
func primaryArea() Area {
	var boundingBox rect
	resultCall, _, _ := procSystemParametersInfo.Call(
		spiGetWorkArea,
		0,
		uintptr(unsafe.Pointer(&boundingBox)), //nolint:gosec // API do Windows exige ponteiro cru aqui
		0,
	)
	if resultCall == 0 {
		return Area{Width: fallbackWidth, Height: fallbackHeight, Scale: 1}
	}

	scale := 1.0
	if monitor, _, _ := procMonitorFromRect.Call(uintptr(unsafe.Pointer(&boundingBox)), monitorDefaultToPrimary); monitor != 0 { //nolint:gosec // API do Windows exige ponteiro cru aqui
		scale = scaleOfMonitor(monitor)
	}

	return areaFromRect(boundingBox, scale)
}
