package reporting

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"time"

	"github.com/gorilla/websocket"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/metrics"
)

// Os códigos de fechamento que o dashboard usa (faixa 4000-4999, reservada
// pelo padrão para a aplicação). Ver `agent.gateway.ts` no dashboard.
const (
	closeInvalidToken = 4001
	closeBlocked      = 4003
)

const (
	// Quanto esperar antes da primeira nova tentativa, e o teto do recuo.
	// O recuo dobra a cada falha: rede que caiu volta em segundos, servidor
	// que caiu volta em minutos, e insistir de segundo em segundo só
	// atrapalharia os dois.
	firstRetryDelay = 5 * time.Second
	maxRetryDelay   = 5 * time.Minute

	// Quanto esperar pela conexão e por uma escrita antes de desistir dela.
	dialTimeout  = 15 * time.Second
	writeTimeout = 10 * time.Second
)

// outcome é o que fazer depois que uma sessão terminou.
type outcome int

const (
	// outcomeRetry: queda comum (rede, servidor reiniciando). Tenta de novo.
	outcomeRetry outcome = iota
	// outcomeWait: o TI bloqueou esta máquina. Insistir depressa não
	// desbloqueia nada, mas desistir de vez exigiria reinstalar o agente
	// depois que alguém desbloquear — então espera o recuo máximo.
	outcomeWait
	// outcomeStop: o token não vale. Reconectar nunca vai resolver: o
	// conserto é na configuração desta máquina.
	outcomeStop
)

// helloMessage e snapshotMessage são as duas mensagens que o agente manda.
// Os nomes dos campos batem com `agentMessageSchema` do dashboard.
type helloMessage struct {
	Type         string `json:"type"`
	Token        string `json:"token"`
	AgentVersion string `json:"agentVersion"`
}

type snapshotMessage struct {
	Type     string           `json:"type"`
	Snapshot metrics.Snapshot `json:"snapshot"`
}

// SnapshotSource é o que o Reporter precisa de uma fonte de leituras — o
// mesmo par de métodos que o `metrics.Broadcaster` já expõe.
//
// É interface, e não o broadcaster direto, para o teste conseguir entregar
// leituras inventadas: coletar de verdade num teste significaria depender do
// hardware da máquina que está rodando a suíte.
type SnapshotSource interface {
	Latest() metrics.Snapshot
	Subscribe() (<-chan metrics.Snapshot, func())
}

// Reporter mantém a conexão com o painel central viva e empurra os
// snapshots que o broadcaster já coleta para a tela local.
//
// Ele é só mais um assinante do broadcaster (`Subscribe`), como a janela do
// próprio agente: a coleta não muda nem fica mais cara por existir envio.
type Reporter struct {
	config       Config
	source       SnapshotSource
	agentVersion string
}

func NewReporter(config Config, source SnapshotSource, agentVersion string) *Reporter {
	return &Reporter{config: config, source: source, agentVersion: agentVersion}
}

// Run conecta, reconecta e envia até ctx ser cancelado. Chame numa
// goroutine própria.
func (reporter *Reporter) Run(ctx context.Context) {
	attempt := 0

	for {
		sessionError := reporter.session(ctx)
		if ctx.Err() != nil {
			return
		}

		switch classify(sessionError) {
		case outcomeStop:
			log.Printf("reporting: giving up, fix the agent configuration: %v", sessionError)
			return
		case outcomeWait:
			log.Printf("reporting: this machine is blocked by IT, retrying later: %v", sessionError)
			attempt = maxAttempt
		default:
			log.Printf("reporting: connection lost, retrying: %v", sessionError)
			attempt++
		}

		if !sleep(ctx, retryDelay(attempt)) {
			return
		}
	}
}

// session é uma conexão, do começo ao fim. Devolver erro é o normal aqui:
// toda conexão termina, e quem decide o que fazer com o fim é o Run.
func (reporter *Reporter) session(ctx context.Context) error {
	dialer := websocket.Dialer{HandshakeTimeout: dialTimeout}

	connection, _, dialError := dialer.DialContext(ctx, reporter.config.ServerURL, nil)
	if dialError != nil {
		return dialError
	}
	defer func() { _ = connection.Close() }()

	hello := helloMessage{Type: "hello", Token: reporter.config.Token, AgentVersion: reporter.agentVersion}
	if writeError := write(connection, hello); writeError != nil {
		return writeError
	}

	/* A leitura roda à parte porque o servidor só fala para recusar ou para
	   confirmar: sem alguém lendo, o motivo do fechamento nunca chegaria aqui
	   e toda recusa viraria "conexão caiu". */
	closed := make(chan error, 1)
	go func() { closed <- drain(connection) }()

	return reporter.pump(ctx, connection, closed)
}

// pump envia um snapshot a cada intervalo configurado, até a conexão cair.
func (reporter *Reporter) pump(ctx context.Context, connection *websocket.Conn, closed <-chan error) error {
	updates, unsubscribe := reporter.source.Subscribe()
	defer unsubscribe()

	ticker := time.NewTicker(reporter.config.Interval)
	defer ticker.Stop()

	/* A primeira leitura vai na hora: quem acabou de instalar o agente quer
	   ver a máquina aparecer no painel, não esperar meio minuto por ela. */
	if sendError := reporter.send(connection); sendError != nil {
		return finalError(closed, sendError)
	}

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case closeError := <-closed:
			return closeError
		case <-ticker.C:
			if sendError := reporter.send(connection); sendError != nil {
				return finalError(closed, sendError)
			}
		case <-updates:
			/* Descartado de propósito: o canal existe só para o broadcaster
			   não considerar este assinante parado. Quem manda na cadência do
			   envio é o ticker, não a coleta de um em um segundo. */
		}
	}
}

func (reporter *Reporter) send(connection *websocket.Conn) error {
	snapshot := reporter.source.Latest()
	if snapshot.Timestamp.IsZero() {
		/* Ainda não houve coleta nenhuma. Mandar um snapshot vazio gravaria
		   uma máquina sem processador e sem memória no inventário. */
		return nil
	}

	return write(connection, snapshotMessage{Type: "snapshot", Snapshot: snapshot})
}

func write(connection *websocket.Conn, message any) error {
	payload, marshalError := json.Marshal(message)
	if marshalError != nil {
		return marshalError
	}

	if deadlineError := connection.SetWriteDeadline(time.Now().Add(writeTimeout)); deadlineError != nil {
		return deadlineError
	}

	return connection.WriteMessage(websocket.TextMessage, payload)
}

// closeReasonGrace é quanto a escrita espera pelo lado que lê antes de
// desistir de saber o motivo real do fim.
const closeReasonGrace = time.Second

// finalError prefere o motivo que veio do servidor ao erro que a escrita
// viu.
//
// Quando o servidor recusa a conexão, a escrita e a leitura terminam quase
// juntas, e a escrita costuma ganhar a corrida com um "close sent" genérico.
// Devolver esse erro apagaria justamente a informação que decide se vale a
// pena reconectar: "token inválido" e "a rede caiu" viram a mesma linha.
func finalError(closed <-chan error, fallback error) error {
	select {
	case closeError := <-closed:
		return closeError
	case <-time.After(closeReasonGrace):
		return fallback
	}
}

// drain lê até a conexão fechar e devolve o motivo. O conteúdo não
// interessa: o servidor só manda a confirmação do `hello`.
func drain(connection *websocket.Conn) error {
	for {
		if _, _, readError := connection.ReadMessage(); readError != nil {
			return readError
		}
	}
}

// classify traduz o fim de uma sessão na decisão de reconectar ou não.
func classify(sessionError error) outcome {
	var closeError *websocket.CloseError
	if !errors.As(sessionError, &closeError) {
		return outcomeRetry
	}

	switch closeError.Code {
	case closeInvalidToken:
		return outcomeStop
	case closeBlocked:
		return outcomeWait
	default:
		return outcomeRetry
	}
}

// maxAttempt é a tentativa em que retryDelay já chegou ao teto.
const maxAttempt = 16

// retryDelay dobra a espera a cada tentativa, até o teto.
func retryDelay(attempt int) time.Duration {
	delay := firstRetryDelay
	for range attempt {
		delay *= 2
		if delay >= maxRetryDelay {
			return maxRetryDelay
		}
	}

	return delay
}

// sleep espera sem ignorar o cancelamento. Devolve false quando o contexto
// acabou — um agente que está sendo encerrado não fica mais cinco minutos
// preso num time.Sleep.
func sleep(ctx context.Context, duration time.Duration) bool {
	timer := time.NewTimer(duration)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}
