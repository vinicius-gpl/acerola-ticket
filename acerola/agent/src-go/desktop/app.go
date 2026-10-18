package desktop

import (
	"context"
	"sync"
	"time"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/memory"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/metrics"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/reporting"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/tray"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/version"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

const (
	sampleInterval  = 1 * time.Second
	topProcessCount = 25

	// A versão que o agente informa ao painel central no `hello`. É o que
	// aparece na ficha do computador e permite descobrir, sem ir até a
	// máquina, qual delas ainda está com o agente antigo.
	agentVersion = version.Current

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
	mu              sync.RWMutex
	ctx             context.Context
	broadcaster     *metrics.Broadcaster
	actions         chan func(context.Context)
	viewReady       chan struct{}
	isWindowVisible bool
	startupOpen     bool

	// O envio ao painel central: o que está rodando agora, e como pará-lo.
	// Trocar a chave na tela derruba o envio antigo e sobe um novo.
	reporter     *reporting.Reporter
	stopReporter context.CancelFunc
}

func NewApp() *App {
	collector := metrics.New()
	return &App{
		broadcaster: metrics.NewBroadcaster(collector, sampleInterval, topProcessCount),
		actions:     make(chan func(context.Context), 4),
		viewReady:   make(chan struct{}, 1),
	}
}

func (app *App) SetStartupOpen(open bool) {
	app.mu.Lock()
	app.startupOpen = open
	app.mu.Unlock()
}

func (app *App) isVisible() bool {
	app.mu.RLock()
	defer app.mu.RUnlock()
	return app.isWindowVisible
}

func (app *App) setVisible(visible bool) {
	app.mu.Lock()
	app.isWindowVisible = visible
	app.mu.Unlock()
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
	go app.reportToDashboard(ctx)
	go tray.Run(tray.Callbacks{
		ShowPopup:     app.ShowPopup,
		ShowDashboard: app.ShowDashboard,
		Quit:          app.Quit,
	})

	// Como o app nasce oculto na bandeja, libera a memória de inicialização
	// após o WebView2 concluir a carga inicial.
	go func() {
		time.Sleep(1 * time.Second)
		memory.TrimWorkingSet()
	}()
}

// domReady é chamado pelo Wails quando a tela terminou de carregar — só
// então o frontend está ouvindo "view:change". É o ponto em que cada sistema
// decide se abre alguma coisa sozinho (ver showOnStartup).
func (app *App) domReady(context.Context) {
	app.showOnStartup()
}

// Quit é a ação do item "Sair" no menu da bandeja: encerra o processo de
// verdade (diferente de esconder a janela — ver main.go e HideWindow).
func (app *App) Quit() {
	app.dispatch(func(ctx context.Context) {
		runtime.Quit(ctx)
	})
}
