//go:build !windows

package main

import (
	"context"
	"time"

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

// Quantas vezes perguntar à tela se ela já está ouvindo antes de desistir:
// com viewReadyTimeout de espera por tentativa, dá uns dez segundos — folga
// para o modo dev, em que o Vite ainda está entregando os módulos.
const startupAttempts = 50

// showOnStartup abre o Dashboard assim que a tela carrega. Fora do Windows a
// bandeja nem sempre existe (o GNOME, por exemplo, só mostra o ícone com uma
// extensão instalada), e um agente que nasce escondido sem bandeja não teria
// por onde ser aberto.
//
// O aviso de "página carregada" do WebKitGTK chega antes de o Svelte montar e
// começar a ouvir "view:change": mandar o Dashboard direto perdia o evento e
// a janela abria vazia, só com a cor de fundo. Por isso esperamos a tela
// responder antes — a espera roda na fila de ações, então o ShowDashboard
// enfileirado logo depois só executa quando ela termina.
func (app *App) showOnStartup() {
	app.dispatch(func(ctx context.Context) {
		for attempt := 0; attempt < startupAttempts; attempt++ {
			if app.frontendAnswers(func() { runtime.EventsEmit(ctx, "view:change", "idle") }) {
				return
			}
		}
	})
	app.ShowDashboard()
}

// frontendAnswers faz a pergunta — mandar a tela para a rota vazia, onde ela
// já está — e diz se a confirmação (ViewReady) voltou a tempo. A pergunta
// vem de fora para o teste não precisar do contexto do Wails.
func (app *App) frontendAnswers(ask func()) bool {
	select {
	case <-app.viewReady:
	default:
	}

	ask()

	select {
	case <-app.viewReady:
		return true
	case <-time.After(viewReadyTimeout):
		return false
	}
}
