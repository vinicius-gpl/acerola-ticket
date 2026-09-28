package reporting

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
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

	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		connection, upgradeError := upgrader.Upgrade(writer, request, nil)
		if upgradeError != nil {
			return
		}
		defer func() { _ = connection.Close() }()

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

	return "ws" + strings.TrimPrefix(server.URL, "http"), received
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
