package reporting

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"sync"
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
	/* Teto de um minuto, e não de cinco: este agente existe para a máquina
	   aparecer no painel, e cinco minutos escondida depois de o servidor
	   reiniciar é tempo demais para quem está olhando a ficha dela. */
	maxRetryDelay = time.Minute

	// Quanto esperar pela conexão e por uma escrita antes de desistir dela.
	dialTimeout  = 15 * time.Second
	writeTimeout = 10 * time.Second

	// O ritmo mais rápido que o servidor consegue pedir. É a mesma cadência da
	// tela do próprio agente: abaixo disso não há leitura nova para mandar,
	// porque o coletor mede uma vez por segundo.
	fastestCadence = time.Second

	// Quanto tempo de silêncio TOTAL do servidor conta como conexão morta.
	//
	// O servidor manda um ping a cada 15 segundos (ver agent.gateway.ts). Um
	// cabo arrancado ou um Wi-Fi que cai não fecham a conexão: os dois lados
	// continuam achando que ela está de pé, e o agente segue "enviando" para um
	// cano que não existe mais. Este prazo é o que transforma isso numa queda
	// detectada, que leva à reconexão.
	//
	// Três rodadas de ping de folga: uma perdida é rede engasgando, três é
	// queda.
	serverSilenceTimeout = 45 * time.Second

	// Quanto esperar pela confirmação do servidor depois de se apresentar.
	//
	// Generoso: do outro lado há uma consulta ao banco, e um banco na nuvem
	// acordando de suspensão leva alguns segundos. Estourar aqui é tratado como
	// queda comum — tenta de novo, e não desiste.
	welcomeTimeout = 20 * time.Second
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

// State é o que a TELA do agente mostra sobre o envio. Em inglês como todo
// identificador; quem escreve a frase em português é o frontend.
type State string

const (
	// StateOff: esta máquina não foi configurada para reportar.
	StateOff State = "off"
	// StateConnecting: tentando — nunca conectou ainda, ou caiu e vai voltar.
	StateConnecting State = "connecting"
	// StateConnected: conexão aberta, leituras saindo.
	StateConnected State = "connected"
	// StateRejected: o painel recusou a chave. Só configuração conserta.
	StateRejected State = "rejected"
	// StateBlocked: o TI bloqueou esta máquina no painel.
	StateBlocked State = "blocked"
)

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

	mutex sync.RWMutex
	state State
}

func NewReporter(config Config, source SnapshotSource, agentVersion string) *Reporter {
	return &Reporter{
		config:       config,
		source:       source,
		agentVersion: agentVersion,
		state:        StateConnecting,
	}
}

// State é o estado atual, para a tela. Seguro de chamar de qualquer goroutine.
func (reporter *Reporter) State() State {
	reporter.mutex.RLock()
	defer reporter.mutex.RUnlock()

	return reporter.state
}

func (reporter *Reporter) setState(state State) {
	reporter.mutex.Lock()
	reporter.state = state
	reporter.mutex.Unlock()
}

// Run conecta, reconecta e envia até ctx ser cancelado. Chame numa
// goroutine própria.
func (reporter *Reporter) Run(ctx context.Context) {
	attempt := 0

	for {
		reporter.setState(StateConnecting)

		sessionError := reporter.session(ctx)
		if ctx.Err() != nil {
			return
		}

		switch classify(sessionError) {
		case outcomeStop:
			reporter.setState(StateRejected)
			log.Printf("reporting: giving up, fix the agent configuration: %v", sessionError)

			return
		case outcomeWait:
			reporter.setState(StateBlocked)
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

	/* A leitura roda à parte: é por ela que chega a recusa (sem alguém lendo, o
	   motivo do fechamento nunca chegaria aqui e toda recusa viraria "conexão
	   caiu") e é por ela que chega o pedido de mudar o ritmo. */
	closed := make(chan error, 1)
	cadence := make(chan time.Duration, 1)
	welcome := make(chan struct{}, 1)
	go func() {
		closed <- read(connection, cadence, welcome, reporter.config.Interval, serverSilenceTimeout)
	}()

	/* ESPERA a confirmação antes de mandar qualquer leitura.
	   É para isto que o `welcome` existe. Conferir o token, do lado do servidor, é uma ida ao
	   banco: mandar a leitura logo atrás da apresentação faz ela chegar enquanto a sessão
	   ainda não existe, e a conexão cai com "snapshot before hello" — o que acontecia a cada
	   reconexão, deixando a ficha da máquina congelada no painel. */
	select {
	case <-welcome:
	case closeError := <-closed:
		return closeError
	case <-ctx.Done():
		return ctx.Err()
	case <-time.After(welcomeTimeout):
		return errNoWelcome
	}

	reporter.setState(StateConnected)

	return reporter.pump(ctx, connection, closed, cadence)
}

// pump envia um snapshot a cada intervalo configurado, até a conexão cair.
func (reporter *Reporter) pump(
	ctx context.Context,
	connection *websocket.Conn,
	closed <-chan error,
	cadence <-chan time.Duration,
) error {
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
		case interval := <-cadence:
			/* O servidor pediu outro ritmo — alguém abriu a ficha desta máquina no
			   painel, ou fechou. Trocar o ticker aqui, e não reconectar, mantém a
			   conexão de pé e o efeito é imediato na próxima leitura. */
			log.Printf("reporting: server asked for readings every %v", interval)
			ticker.Reset(interval)

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

// errNoWelcome é o fim de uma conexão que abriu e nunca confirmou a
// apresentação. É queda comum: tenta de novo.
var errNoWelcome = errors.New("reporting: the server did not confirm the connection")

// serverMessage é o que o servidor manda. Os nomes batem com
// `serverMessageSchema` do dashboard.
type serverMessage struct {
	Type    string `json:"type"`
	Seconds int    `json:"seconds"`
}

// read lê até a conexão fechar e devolve o motivo, repassando pelo caminho os
// pedidos de mudar o ritmo.
//
// Mensagem que não dá para entender é IGNORADA, e não derruba a conexão: o
// servidor pode ser mais novo que este agente e ter passado a mandar algo que
// ele ainda não conhece. Perder o envio inteiro por causa disso seria trocar
// uma máquina monitorada por nada.
func read(
	connection *websocket.Conn,
	cadence chan<- time.Duration,
	welcome chan<- struct{},
	rest time.Duration,
	silenceTimeout time.Duration,
) error {
	/* Cada sinal de vida do servidor empurra o prazo para frente. Sem prazo, uma
	   conexão meio aberta prenderia esta leitura para sempre e o agente nunca
	   tentaria reconectar. */
	renew := func() error { return connection.SetReadDeadline(time.Now().Add(silenceTimeout)) }

	if deadlineError := renew(); deadlineError != nil {
		return deadlineError
	}

	/* O `gorilla` responde ao ping sozinho; o que ele não faz é renovar o prazo,
	   e é por isso que o tratador é trocado aqui em vez de deixado no padrão. */
	connection.SetPingHandler(func(message string) error {
		if deadlineError := renew(); deadlineError != nil {
			return deadlineError
		}

		return connection.WriteControl(websocket.PongMessage, []byte(message), time.Now().Add(writeTimeout))
	})

	for {
		_, payload, readError := connection.ReadMessage()
		if readError != nil {
			return readError
		}

		if deadlineError := renew(); deadlineError != nil {
			return deadlineError
		}

		dispatch(payload, cadence, welcome, rest)
	}
}

// dispatch entrega a mensagem do servidor a quem a espera.
//
// Os envios são NÃO BLOQUEANTES: quem lê a conexão não pode ficar parado
// esperando alguém consumir um aviso, ou o prazo de silêncio venceria com a
// conexão viva. Um aviso repetido que não coube é descartado — o mais novo
// não acrescenta nada ao que já está na fila.
func dispatch(
	payload []byte,
	cadence chan<- time.Duration,
	welcome chan<- struct{},
	rest time.Duration,
) {
	var message serverMessage
	if json.Unmarshal(payload, &message) != nil {
		/* Mensagem ilegível não derruba o envio: o servidor pode ser mais novo que
		   este agente e ter passado a mandar algo que ele ainda não conhece. */
		return
	}

	switch message.Type {
	case "welcome":
		select {
		case welcome <- struct{}{}:
		default:
		}
	case "cadence":
		select {
		case cadence <- cadenceOf(message.Seconds, rest):
		default:
		}
	}
}

// cadenceOf traduz o pedido do servidor em intervalo.
//
// Zero é "volte ao SEU intervalo": quem sabe qual é ele é este agente — foi
// decidido na instalação desta máquina —, e não o servidor. Valores fora da
// faixa são presos na borda em vez de recusados: um número estranho vindo do
// servidor não pode fazer a máquina parar de reportar.
func cadenceOf(seconds int, rest time.Duration) time.Duration {
	if seconds <= 0 {
		return rest
	}

	asked := time.Duration(seconds) * time.Second
	if asked < fastestCadence {
		return fastestCadence
	}
	if asked > MaxInterval {
		return MaxInterval
	}

	return asked
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
