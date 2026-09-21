// Package window fala direto com a API de janelas do Windows para as duas
// coisas que o Wails não resolve:
//
//  1. Colocar a janela em qualquer monitor. O `runtime.WindowSetPosition`
//     do Wails não aceita coordenada absoluta: ele soma o que recebe ao
//     canto da área útil do monitor em que a janela já está (ver
//     winc/controlbase.go no módulo do Wails), então nunca consegue mandar
//     a janela pra outra tela. Aqui usamos `SetWindowPos`, que trabalha em
//     coordenada absoluta da área de trabalho inteira.
//
//  2. Arredondar os cantos no Windows 10. No Windows 11 o próprio sistema
//     arredonda toda janela, com antialiasing; no 10 esse recurso não
//     existe, e o `border-radius` do CSS só revela a cor de fundo da janela
//     nos cantos — de longe a janela parece quadrada. A saída no 10 é
//     recortar a janela numa região arredondada (`SetWindowRgn`).
package window

import (
	"sync"
	"unsafe"

	"golang.org/x/sys/windows"
)

// ClassName é o nome de classe registrado para a janela do agente (ver
// `WindowClassName` em main.go). É por ele que encontramos o handle da
// janela: o Wails não expõe esse handle em nenhum ponto da API pública.
const ClassName = "AcerolaAgentWindow"

const (
	// SetWindowPos: não mexe na ordem das janelas nem rouba o foco — quem
	// decide mostrar a janela é o app.go, depois de posicionar.
	swpNoZOrder   = 0x0004
	swpNoActivate = 0x0010

	// Primeira build do Windows 11. O 11 continua se declarando "versão 10"
	// pra compatibilidade; o número da build é o que separa os dois.
	windows11FirstBuild = 22000
)

var (
	user32 = windows.NewLazySystemDLL("user32.dll")
	gdi32  = windows.NewLazySystemDLL("gdi32.dll")

	procFindWindow         = user32.NewProc("FindWindowW")
	procSetWindowPos       = user32.NewProc("SetWindowPos")
	procSetWindowRgn       = user32.NewProc("SetWindowRgn")
	procCreateRoundRectRgn = gdi32.NewProc("CreateRoundRectRgn")
)

// Handle localiza a janela nativa do agente. Devolve 0 se ela ainda não
// existir — quem chama trata isso como "não dá pra posicionar agora".
func Handle() windows.HWND {
	return handleOfClass(ClassName)
}

// handleOfClass é o Handle parametrizado, pra que o teste possa procurar uma
// classe que com certeza não existe: o Handle() de verdade acha ou não acha
// dependendo de o agente estar aberto na máquina naquele momento, o que não
// serve como asserção.
func handleOfClass(className string) windows.HWND {
	namePointer, conversionError := windows.UTF16PtrFromString(className)
	if conversionError != nil {
		return 0
	}

	handle, _, _ := procFindWindow.Call(uintptr(unsafe.Pointer(namePointer)), 0) //nolint:gosec // API do Windows exige ponteiro cru aqui
	return windows.HWND(handle)
}

// Place move e redimensiona a janela de uma vez, em coordenada absoluta e
// pixel físico. Fazer as duas coisas na mesma chamada evita o "pulo" de
// mover primeiro e redimensionar depois.
func Place(handle windows.HWND, x, y, width, height int) {
	if handle == 0 {
		return
	}

	setWindowPos(handle, x, y, width, height)

	// Ao cruzar pra um monitor com zoom diferente, o Windows avisa a janela
	// (WM_DPICHANGED) e o Wails obedece ao tamanho sugerido por ele — que é
	// o nosso tamanho reescalado mais uma vez, ou seja, errado. Repetimos a
	// chamada: a janela já está no monitor de destino, o aviso não se repete
	// e o tamanho que fica valendo é o nosso.
	setWindowPos(handle, x, y, width, height)
}

func setWindowPos(handle windows.HWND, x, y, width, height int) {
	// As coordenadas podem ser negativas (monitor à esquerda do principal);
	// a conversão via int32 preserva o sinal do jeito que a API espera.
	_, _, _ = procSetWindowPos.Call(
		uintptr(handle),
		0,
		uintptr(int32(x)),
		uintptr(int32(y)),
		uintptr(int32(width)),
		uintptr(int32(height)),
		swpNoZOrder|swpNoActivate,
	)
}

// RoundCorners recorta a janela num retângulo de cantos arredondados — só
// no Windows 10, onde o sistema não faz isso sozinho. No Windows 11 o DWM
// já arredonda com antialiasing, e aplicar o recorte lá deixaria os cantos
// serrilhados; por isso a função não faz nada.
//
// O recorte é fixo em pixels e não acompanha a janela: precisa ser refeito
// a cada mudança de tamanho.
func RoundCorners(handle windows.HWND, width, height, radius int) {
	if handle == 0 || isWindows11() {
		return
	}

	// CreateRoundRectRgn trata a borda direita e a inferior como exclusivas
	// (o último pixel fica de fora), daí o +1. E os dois últimos parâmetros
	// são a largura e a altura inteiras da elipse do canto, não o raio — por
	// isso o dobro.
	region, _, _ := procCreateRoundRectRgn.Call(
		0, 0,
		uintptr(width+1), uintptr(height+1),
		uintptr(radius*2), uintptr(radius*2),
	)
	if region == 0 {
		return
	}

	// A partir daqui a janela é dona da região: o Windows libera sozinho
	// quando ela for substituída ou a janela fechar. Liberar aqui seria um
	// uso de memória já devolvida.
	_, _, _ = procSetWindowRgn.Call(uintptr(handle), region, 1)
}

// isWindows11 pergunta a versão real ao ntdll. As funções antigas
// (GetVersionEx) mentem quando o executável não declara compatibilidade com
// o Windows atual no manifesto; RtlGetVersion sempre diz a verdade. O
// resultado nunca muda enquanto o app roda, então é calculado uma vez só.
var isWindows11 = sync.OnceValue(func() bool {
	version := windows.RtlGetVersion()
	if version.MajorVersion > 10 {
		return true
	}

	return version.MajorVersion == 10 && version.BuildNumber >= windows11FirstBuild
})
