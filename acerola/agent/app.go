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
}

func NewApp() *App {
	collector := metrics.New()
	return &App{
		broadcaster: metrics.NewBroadcaster(collector, sampleInterval, topProcessCount),
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

func (a *App) context() (context.Context, bool) {
	a.mu.RLock()
	defer a.mu.RUnlock()
	return a.ctx, a.ctx != nil
}

// ShowPopup é a ação do clique esquerdo na bandeja: encolhe a janela pro
// tamanho de popup e mostra.
func (a *App) ShowPopup() {
	ctx, ok := a.context()
	if !ok {
		return // clique chegou antes do startup terminar; não deveria acontecer na prática
	}
	runtime.WindowSetSize(ctx, popupWidth, popupHeight)
	runtime.EventsEmit(ctx, "view:change", "popup")
	runtime.WindowShow(ctx)
}

// ShowDashboard é a ação do item "Abrir Dashboard" no menu da bandeja:
// redimensiona pro tamanho cheio, centraliza e mostra.
func (a *App) ShowDashboard() {
	ctx, ok := a.context()
	if !ok {
		return
	}
	runtime.WindowSetSize(ctx, dashboardWidth, dashboardHeight)
	runtime.WindowCenter(ctx)
	runtime.EventsEmit(ctx, "view:change", "dashboard")
	runtime.WindowShow(ctx)
}

// Quit é a ação do item "Sair" no menu da bandeja: encerra o processo de
// verdade (diferente de fechar a janela, que só esconde — ver main.go).
func (a *App) Quit() {
	ctx, ok := a.context()
	if !ok {
		return
	}
	runtime.Quit(ctx)
}

// HidePopup é exposto ao frontend (via Bind) para a view popup chamar
// quando perde o foco — "fecha ao perder foco" do pedido original.
func (a *App) HidePopup() {
	ctx, ok := a.context()
	if !ok {
		return
	}
	runtime.WindowHide(ctx)
}
