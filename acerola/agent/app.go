package main

import (
	"context"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/metrics"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/tray"
)

const (
	sampleInterval  = 1 * time.Second
	topProcessCount = 25

	popupWidth  = 340
	popupHeight = 420

	dashboardWidth  = 1100
	dashboardHeight = 720
)

// App é o struct que o Wails expõe pro frontend (via Bind) e que guarda o
// contexto da janela — precisamos dele pra chamar qualquer função do pacote
// runtime (mostrar/esconder janela, emitir evento).
type App struct {
	mu          sync.RWMutex
	ctx         context.Context
	broadcaster *metrics.Broadcaster
	actions     chan func(context.Context)
}

func NewApp() *App {
	collector := metrics.New()
	return &App{
		broadcaster: metrics.NewBroadcaster(collector, sampleInterval, topProcessCount),
		actions:     make(chan func(context.Context), 4),
	}
}

// startup é chamado pelo Wails quando a janela (ainda escondida) fica
// pronta — mas não durante a geração de bindings (`wails build` compila e
// roda o próprio binário com a tag "bindings" pra descobrir os métodos
// expostos; o pacote wails garante que OnStartup não é chamado nesse modo).
// É por isso que a bandeja nasce aqui dentro, e não em main(): se
// tray.Run — que bloqueia esperando clique — rodasse incondicionalmente em
// main(), o processo de geração de bindings nunca terminaria.
func (a *App) startup(ctx context.Context) {
	a.mu.Lock()
	a.ctx = ctx
	a.mu.Unlock()

	go a.broadcaster.Run(ctx)
	go a.forwardSnapshots(ctx)
	go a.runActions(ctx)
	go tray.Run(tray.Callbacks{
		ShowPopup:     a.ShowPopup,
		ShowDashboard: a.ShowDashboard,
		Quit:          a.Quit,
	})
}

// forwardSnapshots assina o broadcaster e empurra cada leitura pro frontend
// via evento nativo do Wails (runtime.EventsEmit / runtime.EventsOn) — sem
// servidor HTTP, sem WebSocket manual, o Wails já resolve esse transporte.
func (a *App) forwardSnapshots(ctx context.Context) {
	updates, unsubscribe := a.broadcaster.Subscribe()
	defer unsubscribe()

	for {
		select {
		case <-ctx.Done():
			return
		case snap := <-updates:
			runtime.EventsEmit(ctx, "metrics:snapshot", snap)
		}
	}
}

// runActions executa as ações de janela (mostrar, esconder, redimensionar)
// sempre nesta mesma goroutine neutra — nunca na goroutine que despacha o
// clique da bandeja. O systray trava sua própria thread do sistema
// operacional pra bombear mensagens nativas do Windows (ver
// docs/ARQUITETURA.md); chamar uma função do runtime do Wails direto dali
// arrisca um deadlock entre a fila de mensagens do systray e a da janela.
// Por isso ShowPopup/ShowDashboard/Quit só mandam uma função pra este canal
// — quem clicou nunca espera a ação terminar.
func (a *App) runActions(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case action := <-a.actions:
			action(ctx)
		}
	}
}

func (a *App) dispatch(action func(context.Context)) {
	a.actions <- action
}

// ShowPopup é a ação do clique esquerdo na bandeja: encolhe a janela pro
// tamanho de popup e mostra.
func (a *App) ShowPopup() {
	a.dispatch(func(ctx context.Context) {
		runtime.WindowSetSize(ctx, popupWidth, popupHeight)
		runtime.EventsEmit(ctx, "view:change", "popup")
		runtime.WindowShow(ctx)
	})
}

// ShowDashboard é a ação do item "Abrir Dashboard" no menu da bandeja:
// redimensiona pro tamanho cheio, centraliza e mostra.
func (a *App) ShowDashboard() {
	a.dispatch(func(ctx context.Context) {
		runtime.WindowSetSize(ctx, dashboardWidth, dashboardHeight)
		runtime.WindowCenter(ctx)
		runtime.EventsEmit(ctx, "view:change", "dashboard")
		runtime.WindowShow(ctx)
	})
}

// Quit é a ação do item "Sair" no menu da bandeja: encerra o processo de
// verdade (diferente de esconder a janela — ver main.go e HideWindow).
func (a *App) Quit() {
	a.dispatch(func(ctx context.Context) {
		runtime.Quit(ctx)
	})
}

// HideWindow é exposto ao frontend (via Bind): a popup chama ao perder o
// foco ("fecha ao perder foco" do pedido original), e o dashboard chama
// pelo próprio botão de fechar — a janela não tem moldura nativa, então não
// existe um X do Windows pra isso (ver docs/ARQUITETURA.md).
func (a *App) HideWindow() {
	a.dispatch(func(ctx context.Context) {
		runtime.WindowHide(ctx)
	})
}
