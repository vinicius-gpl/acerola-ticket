package main

import (
	"context"

	"golang.org/x/sys/windows"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/screen"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/window"
)

// Raio dos cantos da janela, igual ao `rounded-lg` do CSS em
// popup.svelte/dashboard.svelte. Só tem efeito no Windows 10, onde o
// recorte da janela é feito na mão (ver src-go/window).
const cornerRadius = 8

// windowHandle guarda o handle da janela nativa (protegido por app.mu). Mora
// aqui, e não no struct App, porque o tipo só existe no Windows — e o App é
// um só por processo.
var windowHandle windows.HWND

// nativeWindow devolve o handle da janela nativa, descoberto na primeira
// vez que precisamos dele. Não dá pra resolver isso no NewApp: a janela só
// existe depois que o Wails sobe.
func (app *App) nativeWindow() windows.HWND {
	app.mu.Lock()
	defer app.mu.Unlock()

	if windowHandle == 0 {
		windowHandle = window.Handle()
	}

	return windowHandle
}

// placeWindow coloca a janela no canto inferior direito do monitor onde a
// pessoa está trabalhando (ver screen.ActiveArea), no tamanho pedido.
//
// Recebe o tamanho em pixels lógicos — o mesmo número que o CSS enxerga — e
// converte pela escala do monitor de destino: num monitor a 150% a janela
// sairia pequena demais se usássemos o número cru.
func (app *App) placeWindow(_ context.Context, logicalWidth, logicalHeight int) {
	area := screen.ActiveArea()
	x, y, width, height := placement(area, logicalWidth, logicalHeight)

	handle := app.nativeWindow()
	window.Place(handle, x, y, width, height)
	window.RoundCorners(handle, width, height, scaled(cornerRadius, area.Scale))
}

// showOnStartup não abre nada no Windows: o agente nasce escondido e a
// bandeja, que lá sempre existe, é a porta de entrada.
func (app *App) showOnStartup() {}
