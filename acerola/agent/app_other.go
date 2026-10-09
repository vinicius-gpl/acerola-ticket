//go:build !windows

package main

import (
	"context"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/screen"
)

// Tamanho assumido quando o Wails não informa nenhuma tela — errar a posição
// da janela por alguns pixels é bem menos grave que não abrir.
const (
	fallbackScreenWidth  = 1920
	fallbackScreenHeight = 1080
)

// placeWindow coloca a janela no canto inferior direito da tela atual, no
// tamanho pedido, usando só o que o Wails oferece — fora do Windows não há
// API nativa nossa (ver app_windows.go).
//
// O Wails posiciona em relação à tela em que a janela já está, e é por isso
// que a Area nasce com origem zero. No Wayland o sistema ignora o pedido de
// posição e decide sozinho onde a janela aparece; o tamanho vale do mesmo
// jeito.
func (app *App) placeWindow(ctx context.Context, logicalWidth, logicalHeight int) {
	screens, _ := runtime.ScreenGetAll(ctx)
	x, y, width, height := placement(areaOfCurrentScreen(screens), logicalWidth, logicalHeight)

	runtime.WindowSetSize(ctx, width, height)
	runtime.WindowSetPosition(ctx, x, y)
}

// areaOfCurrentScreen escolhe a tela em que a janela está. A escala fica em
// 1: os tamanhos que o Wails devolve aqui já são lógicos.
func areaOfCurrentScreen(screens []runtime.Screen) screen.Area {
	for _, candidate := range screens {
		if candidate.IsCurrent {
			return screen.Area{Width: candidate.Size.Width, Height: candidate.Size.Height, Scale: 1}
		}
	}

	return screen.Area{Width: fallbackScreenWidth, Height: fallbackScreenHeight, Scale: 1}
}

// showOnStartup abre o Dashboard assim que a tela carrega. Fora do Windows a
// bandeja nem sempre existe (o GNOME, por exemplo, só mostra o ícone com uma
// extensão instalada), e um agente que nasce escondido sem bandeja não teria
// por onde ser aberto.
func (app *App) showOnStartup() {
	app.ShowDashboard()
}
