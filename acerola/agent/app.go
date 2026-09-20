package main

import (
	"context"
	"sync"
	"time"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/metrics"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/screen"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/tray"
)

const (
	sampleInterval  = 1 * time.Second
	topProcessCount = 25

	popupWidth  = 380
	popupHeight = 650

	dashboardWidth  = 1100
	dashboardHeight = 720

	// Espaço entre a janela e a borda da área útil da tela (ou a barra de
	// tarefas) — sem isso a janela ficaria colada no monitor/na barra.
	screenMargin = 16
)

// App é o struct que o Wails expõe pro frontend (via Bind) e que guarda o
// contexto da janela — precisamos dele pra chamar qualquer função do pacote
// runtime (mostrar/esconder janela, emitir evento).
// viewReadyTimeout limita quanto tempo ShowPopup/ShowDashboard esperam pela
// confirmação do frontend antes de mostrar a janela de qualquer jeito — sem
// isso, um evento perdido travaria a bandeja pra sempre.
const viewReadyTimeout = 200 * time.Millisecond

type App struct {
	mu          sync.RWMutex
	ctx         context.Context
	broadcaster *metrics.Broadcaster
	actions     chan func(context.Context)
	viewReady   chan struct{}
}

func NewApp() *App {
	collector := metrics.New()
	return &App{
		broadcaster: metrics.NewBroadcaster(collector, sampleInterval, topProcessCount),
		actions:     make(chan func(context.Context), 4),
		viewReady:   make(chan struct{}, 1),
	}
}

// startup é chamado pelo Wails quando a janela (ainda escondida) fica
// pronta — mas não durante a geração de bindings (`wails build` compila e
// roda o próprio binário com a tag "bindings" pra descobrir os métodos
// expostos; o pacote wails garante que OnStartup não é chamado nesse modo).
// É por isso que a bandeja nasce aqui dentro, e não em main(): se
// tray.Run — que bloqueia esperando clique — rodasse incondicionalmente em
// main(), o processo de geração de bindings nunca terminaria.
func (app *App) startup(ctx context.Context) {
	app.mu.Lock()
	app.ctx = ctx
	app.mu.Unlock()

	go app.broadcaster.Run(ctx)
	go app.forwardSnapshots(ctx)
	go app.runActions(ctx)
	go tray.Run(tray.Callbacks{
		ShowPopup:     app.ShowPopup,
		ShowDashboard: app.ShowDashboard,
		Quit:          app.Quit,
	})
}

// forwardSnapshots assina o broadcaster e empurra cada leitura pro frontend
// via evento nativo do Wails (runtime.EventsEmit / runtime.EventsOn) — sem
// servidor HTTP, sem WebSocket manual, o Wails já resolve esse transporte.
func (app *App) forwardSnapshots(ctx context.Context) {
	updates, unsubscribe := app.broadcaster.Subscribe()
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
func (app *App) runActions(ctx context.Context) {
	for {
		select {
		case <-ctx.Done():
			return
		case action := <-app.actions:
			action(ctx)
		}
	}
}

func (app *App) dispatch(action func(context.Context)) {
	app.actions <- action
}

// awaitViewReady espera o frontend confirmar (via ViewReady) que já trocou
// de rota e pintou a tela nova, antes de mostrar a janela de verdade.
//
// EventsEmit só enfileira a mensagem pro processo do WebView2 — ele não
// espera o JavaScript rodar. Se WindowShow acontecesse logo em seguida, o
// Windows podia pintar a janela um instante antes da troca de rota chegar,
// mostrando a tela antiga (ou em branco) do tamanho errado por um frame: a
// "piscada" ao abrir por cima de outro app com foco. Descartamos qualquer
// confirmação atrasada de uma troca de tela anterior antes de esperar por
// uma nova, e desistimos depois de viewReadyTimeout pra nunca travar a
// bandeja se o frontend não confirmar.
func (app *App) awaitViewReady() {
	select {
	case <-app.viewReady:
	default:
	}
	select {
	case <-app.viewReady:
	case <-time.After(viewReadyTimeout):
	}
}

// ViewReady é exposto ao frontend (via Bind): app.svelte chama depois de
// trocar de rota e esperar o navegador pintar o quadro — ver awaitViewReady.
func (app *App) ViewReady() {
	select {
	case app.viewReady <- struct{}{}:
	default:
	}
}

// ShowPopup é a ação do clique esquerdo na bandeja: encolhe a janela pro
// tamanho de popup e mostra ancorada no canto inferior direito da área útil
// da tela — onde a bandeja do Windows normalmente vive — como um flyout de
// volume/rede/bateria do próprio sistema.
func (app *App) ShowPopup() {
	app.dispatch(func(ctx context.Context) {
		runtime.WindowSetAlwaysOnTop(ctx, true)
		areaX, areaY, areaWidth, areaHeight := screen.WorkArea()
		targetHeight := popupHeight
		if maxHeight := areaHeight - (screenMargin * 2); targetHeight > maxHeight {
			targetHeight = maxHeight
		}
		runtime.WindowSetSize(ctx, popupWidth, targetHeight)
		runtime.WindowSetPosition(ctx,
			areaX+areaWidth-popupWidth-screenMargin,
			areaY+areaHeight-targetHeight-screenMargin,
		)
		runtime.EventsEmit(ctx, "view:change", "popup")
		app.awaitViewReady()
		runtime.WindowShow(ctx)
		runtime.EventsEmit(ctx, "window:shown", "popup")
	})
}

// ShowDashboard é a ação do item "Abrir Dashboard" no menu da bandeja:
// redimensiona pro tamanho cheio e ancora no canto inferior direito da
// área útil da tela — do mesmo lado da bandeja do Windows — sem cobrir a
// barra de tarefas nem ficar colado na borda do monitor.
func (app *App) ShowDashboard() {
	app.dispatch(func(ctx context.Context) {
		runtime.WindowSetAlwaysOnTop(ctx, false)
		runtime.WindowSetSize(ctx, dashboardWidth, dashboardHeight)
		areaX, areaY, areaWidth, areaHeight := screen.WorkArea()
		runtime.WindowSetPosition(ctx,
			areaX+areaWidth-dashboardWidth-screenMargin,
			areaY+areaHeight-dashboardHeight-screenMargin,
		)
		runtime.EventsEmit(ctx, "view:change", "dashboard")
		app.awaitViewReady()
		runtime.WindowShow(ctx)
		runtime.EventsEmit(ctx, "window:shown", "dashboard")
	})
}

// Quit é a ação do item "Sair" no menu da bandeja: encerra o processo de
// verdade (diferente de esconder a janela — ver main.go e HideWindow).
func (app *App) Quit() {
	app.dispatch(func(ctx context.Context) {
		runtime.Quit(ctx)
	})
}

// HideWindow é exposto ao frontend (via Bind): a popup chama ao perder o
// foco ("fecha ao perder foco" do pedido original), e o dashboard chama
// pelo próprio botão de fechar — a janela não tem moldura nativa, então não
// existe um X do Windows pra isso (ver docs/ARQUITETURA.md).
func (app *App) HideWindow() {
	app.dispatch(func(ctx context.Context) {
		runtime.WindowSetAlwaysOnTop(ctx, false)
		runtime.WindowHide(ctx)
	})
}
