package reporting

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/metrics"
)

// fakeSource entrega uma leitura inventada, no lugar do broadcaster.
type fakeSource struct {
	snapshot metrics.Snapshot
}

func (source *fakeSource) Latest() metrics.Snapshot { return source.snapshot }

func (source *fakeSource) Subscribe() (<-chan metrics.Snapshot, func()) {
	updates := make(chan metrics.Snapshot)

	return updates, func() {}
}

func sampleSnapshot() metrics.Snapshot {
	return metrics.Snapshot{
		Timestamp: time.Now(),
		Host: metrics.Inventory{
			Hostname:         "MAQUINA-TESTE",
			OS:               "windows",
			TotalMemoryBytes: 8 << 30,
			BootTime:         time.Now().Add(-2 * time.Hour),
		},
		CPU:    metrics.CPUStats{PercentTotal: 12.5},
		Memory: metrics.MemoryStats{UsedPercent: 47},
	}
}

// startFakeDashboard sobe um servidor que aceita a conexão do agente e
// devolve cada mensagem recebida no canal. `closeWith` diferente de zero faz
// o servidor recusar a conexão com aquele código, como o dashboard faz.
func startFakeDashboard(testingContext *testing.T, closeWith int) (string, <-chan string) {
	testingContext.Helper()

	received := make(chan string, 8)
	upgrader := websocket.Upgrader{}
	cadenceRequests := make(chan int, 4)

	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		connection, upgradeError := upgrader.Upgrade(writer, request, nil)
		if upgradeError != nil {
			return
		}
		defer func() { _ = connection.Close() }()

		/* O servidor de teste também FALA: é por aqui que o pedido de mudar o ritmo
		   sai, no meio da conexão já aberta, como o dashboard faz. */
		go func() {
			for seconds := range cadenceRequests {
				_ = connection.WriteMessage(
					websocket.TextMessage,
					[]byte(`{"type":"cadence","seconds":`+strconv.Itoa(seconds)+`}`),
				)
			}
		}()

		for {
			_, payload, readError := connection.ReadMessage()
			if readError != nil {
				return
			}

			select {
			case received <- string(payload):
			default:
			}

			if closeWith == 0 {
				continue
			}

			_ = connection.WriteControl(
				websocket.CloseMessage,
				websocket.FormatCloseMessage(closeWith, "recusado"),
				time.Now().Add(time.Second),
			)

			return
		}
	}))
	testingContext.Cleanup(server.Close)

	cadenceByAddress[server.URL] = cadenceRequests

	return "ws" + strings.TrimPrefix(server.URL, "http"), received
}

/*
O canal de pedidos de cada servidor de teste, achado pelo endereço dele. Guardar num mapa

	evita mudar a assinatura de startFakeDashboard em todos os testes que já existiam.
*/
var cadenceByAddress = map[string]chan int{}

// askCadence faz o servidor de teste pedir outro ritmo ao agente.
func askCadence(testingContext *testing.T, wsAddress string, seconds int) {
	testingContext.Helper()

	requests, found := cadenceByAddress["http"+strings.TrimPrefix(wsAddress, "ws")]
	if !found {
		testingContext.Fatalf("servidor de teste desconhecido: %s", wsAddress)
	}

	requests <- seconds
}

func waitForMessage(testingContext *testing.T, received <-chan string) string {
	testingContext.Helper()

	select {
	case message := <-received:
		return message
	case <-time.After(5 * time.Second):
		testingContext.Fatal("timeout esperando mensagem do agente")

		return ""
	}
}

func TestReporterSendsHelloAndSnapshot(testingContext *testing.T) {
	// feliz: o agente se apresenta com o token e manda a primeira leitura na hora
	address, received := startFakeDashboard(testingContext, 0)

	config := Config{ServerURL: address, Token: "token-de-teste", Interval: MinInterval}
	reporter := NewReporter(config, &fakeSource{snapshot: sampleSnapshot()}, "1.2.3")

	ctx, cancel := context.WithCancel(testingContext.Context())
	defer cancel()
	go reporter.Run(ctx)

	var hello helloMessage
	if unmarshalError := json.Unmarshal([]byte(waitForMessage(testingContext, received)), &hello); unmarshalError != nil {
		testingContext.Fatalf("apresentação ilegível: %v", unmarshalError)
	}
	if hello.Type != "hello" || hello.Token != "token-de-teste" || hello.AgentVersion != "1.2.3" {
		testingContext.Errorf("apresentação inesperada: %+v", hello)
	}

	var snapshot snapshotMessage
	if unmarshalError := json.Unmarshal([]byte(waitForMessage(testingContext, received)), &snapshot); unmarshalError != nil {
		testingContext.Fatalf("leitura ilegível: %v", unmarshalError)
	}
	if snapshot.Type != "snapshot" {
		testingContext.Errorf("tipo inesperado: %q", snapshot.Type)
	}
	if snapshot.Snapshot.Host.Hostname != "MAQUINA-TESTE" {
		testingContext.Errorf("a leitura não levou o inventário: %+v", snapshot.Snapshot.Host)
	}
}

func TestReporterSkipsSnapshotBeforeFirstCollection(testingContext *testing.T) {
	// triste: sem coleta nenhuma, nada é enviado — máquina vazia não vira inventário
	address, received := startFakeDashboard(testingContext, 0)

	config := Config{ServerURL: address, Token: "token-de-teste", Interval: time.Hour}
	reporter := NewReporter(config, &fakeSource{}, "1.2.3")

	ctx, cancel := context.WithCancel(testingContext.Context())
	defer cancel()
	go reporter.Run(ctx)

	if first := waitForMessage(testingContext, received); !strings.Contains(first, `"hello"`) {
		testingContext.Fatalf("esperava a apresentação primeiro, veio %s", first)
	}

	select {
	case unexpected := <-received:
		testingContext.Errorf("não esperava leitura antes da primeira coleta, veio %s", unexpected)
	case <-time.After(300 * time.Millisecond):
	}
}

func TestReporterStopsOnInvalidToken(testingContext *testing.T) {
	// triste: token errado não vira tentativa eterna — reconectar não conserta configuração
	address, received := startFakeDashboard(testingContext, closeInvalidToken)

	config := Config{ServerURL: address, Token: "token-errado", Interval: MinInterval}
	reporter := NewReporter(config, &fakeSource{snapshot: sampleSnapshot()}, "1.2.3")

	finished := make(chan struct{})
	ctx, cancel := context.WithCancel(testingContext.Context())
	defer cancel()
	go func() {
		reporter.Run(ctx)
		close(finished)
	}()

	waitForMessage(testingContext, received)

	select {
	case <-finished:
	case <-time.After(5 * time.Second):
		testingContext.Fatal("o agente deveria ter desistido depois do token recusado")
	}
}

func TestClassifyDecidesByCloseCode(testingContext *testing.T) {
	// feliz: cada código de recusa leva à decisão que corresponde a ele
	cases := []struct {
		code     int
		expected outcome
	}{
		{closeInvalidToken, outcomeStop},
		{closeBlocked, outcomeWait},
		{websocket.CloseGoingAway, outcomeRetry},
	}

	for _, singleCase := range cases {
		decision := classify(&websocket.CloseError{Code: singleCase.code})
		if decision != singleCase.expected {
			testingContext.Errorf("para o código %d esperava %v, veio %v", singleCase.code, singleCase.expected, decision)
		}
	}

	// triste: queda que não é fechamento limpo (rede sumiu) sempre tenta de novo
	if decision := classify(context.DeadlineExceeded); decision != outcomeRetry {
		testingContext.Errorf("esperava nova tentativa para erro comum, veio %v", decision)
	}
}

func TestRetryDelayGrowsUpToTheCeiling(testingContext *testing.T) {
	// feliz: a espera dobra a cada tentativa
	if first := retryDelay(0); first != firstRetryDelay {
		testingContext.Errorf("primeira espera inesperada: %v", first)
	}
	if second := retryDelay(1); second != 2*firstRetryDelay {
		testingContext.Errorf("segunda espera inesperada: %v", second)
	}

	// triste: por mais que insista, a espera não passa do teto
	if ceiling := retryDelay(100); ceiling != maxRetryDelay {
		testingContext.Errorf("esperava o teto de %v, veio %v", maxRetryDelay, ceiling)
	}
}

func TestCadenceOfTranslatesWhatTheServerAsks(testingContext *testing.T) {
	const rest = 30 * time.Second

	// feliz: o pedido do servidor vira o intervalo pedido
	if got := cadenceOf(1, rest); got != time.Second {
		testingContext.Errorf("esperava 1s, veio %v", got)
	}

	// feliz: zero devolve o intervalo desta máquina, e não um número de fora
	if got := cadenceOf(0, rest); got != rest {
		testingContext.Errorf("esperava o intervalo configurado (%v), veio %v", rest, got)
	}

	// triste: número estranho não pode fazer a máquina parar de reportar
	if got := cadenceOf(-5, rest); got != rest {
		testingContext.Errorf("esperava o intervalo configurado para um pedido negativo, veio %v", got)
	}
	if got := cadenceOf(99999, rest); got != MaxInterval {
		testingContext.Errorf("esperava o teto de %v, veio %v", MaxInterval, got)
	}
}

func TestReporterSpeedsUpWhenTheServerAsks(testingContext *testing.T) {
	// feliz: o servidor pede pressa e a leitura seguinte vem sem esperar o intervalo lento
	address, received := startFakeDashboard(testingContext, 0)

	/* Intervalo de repouso longo de propósito: se o agente ignorasse o pedido, a
	   segunda leitura só chegaria daqui a uma hora e o teste estouraria o tempo. */
	config := Config{ServerURL: address, Token: "token-de-teste", Interval: time.Hour}
	reporter := NewReporter(config, &fakeSource{snapshot: sampleSnapshot()}, "1.2.3")

	ctx, cancel := context.WithCancel(testingContext.Context())
	defer cancel()
	go reporter.Run(ctx)

	waitForMessage(testingContext, received) // apresentação
	waitForMessage(testingContext, received) // primeira leitura

	askCadence(testingContext, address, 1)

	if second := waitForMessage(testingContext, received); !strings.Contains(second, `"snapshot"`) {
		testingContext.Errorf("esperava uma leitura nova depois do pedido, veio %s", second)
	}
}
