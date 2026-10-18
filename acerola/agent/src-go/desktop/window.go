package desktop

import (
	"context"
	"math"
	"time"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/memory"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/screen"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// forwardSnapshots assina o broadcaster e empurra cada leitura pro frontend
// via evento nativo do Wails (runtime.EventsEmit / runtime.EventsOn) — sem
// servidor HTTP, sem WebSocket manual, o Wails já resolve esse transporte.
// Para economizar memória (RAM) e CPU da WebView2, apenas emite eventos
// quando a janela estiver de fato visível na tela.
func (app *App) forwardSnapshots(ctx context.Context) {
	updates, unsubscribe := app.broadcaster.Subscribe()
	defer unsubscribe()

	for {
		select {
		case <-ctx.Done():
			return
		case snap := <-updates:
			if app.isVisible() {
				runtime.EventsEmit(ctx, "metrics:snapshot", snap)
			}
		}
	}
}

// runActions executa as ações de janela (mostrar, esconder, redimensionar)
// sempre nesta mesma goroutine neutra — nunca na goroutine que despacha o
// clique da bandeja. O systray trava sua própria thread do sistema
// operacional pra bombear mensagens nativas do Windows (ver
// docs/architecture.md); chamar uma função do runtime do Wails direto dali
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

// placement calcula, em pixels físicos, onde e com que tamanho a janela
// deve aparecer: ancorada no canto inferior direito da área útil, com a
// margem de respiro dos dois lados. Em telas baixas a altura encolhe pra
// caber entre as margens, em vez de vazar por baixo da barra de tarefas.
func placement(area screen.Area, logicalWidth, logicalHeight int) (x, y, width, height int) {
	margin := scaled(screenMargin, area.Scale)
	width = scaled(logicalWidth, area.Scale)
	height = scaled(logicalHeight, area.Scale)

	if maxHeight := area.Height - (margin * 2); height > maxHeight {
		height = maxHeight
	}

	return area.X + area.Width - width - margin,
		area.Y + area.Height - height - margin,
		width,
		height
}

// scaled converte pixel lógico em pixel físico pelo zoom do monitor.
func scaled(logicalPixels int, scale float64) int {
	return int(math.Round(float64(logicalPixels) * scale))
}

// ShowPopup é a ação do clique esquerdo na bandeja: encolhe a janela pro
// tamanho de popup e mostra ancorada no canto inferior direito da área útil
// do monitor em que a pessoa está trabalhando — onde a bandeja do Windows
// normalmente vive — como um flyout de volume/rede/bateria do próprio
// sistema.
func (app *App) ShowPopup() {
	app.showView("popup", popupWidth, popupHeight)
}

// ShowSettings abre a tela de CONFIGURAÇÃO do agente, e só ela.
//
// É uma tela à parte de propósito: ligar esta máquina ao painel do TI é uma
// tarefa de instalação, feita uma vez, e não tem nada a ver com acompanhar o
// desempenho — que é para o que servem a telinha e o Dashboard. Misturar as
// duas coisas deixaria um formulário de chave no meio de gráficos.
//
// Usa o tamanho da popup: é um formulário de dois campos, e a janela grande
// só criaria espaço vazio.
func (app *App) ShowSettings() {
	app.showView("settings", popupWidth, popupHeight)
}

// ShowDashboard é a ação do item "Abrir Dashboard" no menu da bandeja:
// redimensiona pro tamanho cheio e ancora no canto inferior direito da área
// útil do monitor em que a pessoa está trabalhando — do mesmo lado da
// bandeja do Windows — sem cobrir a barra de tarefas nem ficar colado na
// borda do monitor.
func (app *App) ShowDashboard() {
	app.showView("dashboard", dashboardWidth, dashboardHeight)
}

// HideWindow é exposto ao frontend (via Bind): a popup chama ao perder o
// foco ("fecha ao perder foco" do pedido original), e o dashboard chama
// pelo próprio botão de fechar — a janela não tem moldura nativa, então não
// existe um X do Windows pra isso (ver docs/architecture.md).
//
// Esconder a janela nativa não desmonta a tela: sem o passo extra abaixo, a
// Popup ou o Dashboard continuariam vivos em segundo plano — com todos os
// gráficos (uPlot) e popovers de processo retendo memória — e o
// TrimWorkingSet não teria o que devolver de verdade ao Windows. Por isso a
// janela some primeiro (resposta instantânea ao clique) e só depois a tela
// troca pra "idle" (ver svelte/src/views/idle), que desmonta tudo antes do
// trim rodar.
func (app *App) HideWindow() {
	app.dispatch(func(ctx context.Context) {
		app.setVisible(false)
		runtime.WindowSetAlwaysOnTop(ctx, false)
		runtime.WindowHide(ctx)
		runtime.EventsEmit(ctx, "view:change", "idle")
		app.awaitViewReady()
		memory.TrimWorkingSet()
	})
}

// Uma sequência única mantém a troca de rota antes de a janela aparecer.
func (app *App) showView(view string, width, height int) {
	app.dispatch(func(ctx context.Context) {
		app.setVisible(true)
		runtime.WindowSetAlwaysOnTop(ctx, view == "popup")
		app.placeWindow(ctx, width, height)
		runtime.EventsEmit(ctx, "view:change", view)
		app.awaitViewReady()
		runtime.WindowShow(ctx)
		if view != "settings" {
			app.emitLatestSnapshot(ctx)
		}
		runtime.EventsEmit(ctx, "window:shown", view)
	})
}

func (app *App) emitLatestSnapshot(ctx context.Context) {
	snapshot := app.broadcaster.Latest()
	if snapshot.Timestamp.IsZero() {
		return
	}
	runtime.EventsEmit(ctx, "metrics:snapshot", snapshot)
}
