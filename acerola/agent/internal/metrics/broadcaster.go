package metrics

import (
	"context"
	"log"
	"sync"
	"time"
)

// Broadcaster é o único lugar que chama Collector.Snapshot num timer e
// distribui o resultado pra quantos assinantes existirem (a bandeja e cada
// websocket do painel conectado).
//
// Isso importa porque o cpu.Percent(0, ...) não-bloqueante do gopsutil
// guarda o "instante da última chamada" numa variável de pacote. Se a
// bandeja e o painel web chamassem Collector.Snapshot cada um no seu
// próprio timer, eles brigariam por esse estado compartilhado e relatariam
// percentual de CPU errado. Centralizar a coleta aqui garante que Snapshot
// só é chamado a partir de uma única goroutine.
type Broadcaster struct {
	collector    *Collector
	interval     time.Duration
	processLimit int

	mu     sync.Mutex
	subs   map[chan Snapshot]struct{}
	latest Snapshot
}

func NewBroadcaster(collector *Collector, interval time.Duration, processLimit int) *Broadcaster {
	return &Broadcaster{
		collector:    collector,
		interval:     interval,
		processLimit: processLimit,
		subs:         make(map[chan Snapshot]struct{}),
	}
}

// Run coleta e distribui até ctx ser cancelado. Chame uma vez, na própria
// goroutine.
func (b *Broadcaster) Run(ctx context.Context) {
	ticker := time.NewTicker(b.interval)
	defer ticker.Stop()

	b.tick()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			b.tick()
		}
	}
}

func (b *Broadcaster) tick() {
	snap, err := b.collector.Snapshot(b.processLimit)
	if err != nil {
		log.Printf("metrics: failed to collect snapshot: %v", err)
		return
	}

	b.mu.Lock()
	b.latest = snap
	for ch := range b.subs {
		select {
		case ch <- snap:
		default:
			// Assinante lento: descarta esta amostra em vez de bloquear o
			// coletor. O painel é ao vivo, uma amostra perdida não importa.
		}
	}
	b.mu.Unlock()
}

// Latest retorna o snapshot mais recente sem esperar o próximo tick. É
// suficiente pra bandeja, que consulta na sua própria cadência mais lenta.
func (b *Broadcaster) Latest() Snapshot {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.latest
}

// Subscribe registra um canal que recebe todo snapshot futuro. Chame a
// função retornada quando terminar, pra não vazar o canal.
func (b *Broadcaster) Subscribe() (<-chan Snapshot, func()) {
	ch := make(chan Snapshot, 1)
	b.mu.Lock()
	b.subs[ch] = struct{}{}
	b.mu.Unlock()

	unsubscribe := func() {
		b.mu.Lock()
		delete(b.subs, ch)
		b.mu.Unlock()
	}
	return ch, unsubscribe
}
