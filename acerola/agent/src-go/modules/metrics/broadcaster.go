package metrics

import (
	"context"
	"log"
	"sync"
	"time"
)

// Broadcaster coleta métricas periodicamente e empurra o snapshot pra
// múltiplos assinantes sem travar o coletor se um deles for lento.
//
// O coletor faz I/O (lê /proc ou chama WMI/API do Windows), o que pode levar
// 50-100ms. Broadcaster garante que essa leitura roda numa goroutine só, em
// cadência fixa (1s), e todo mundo que precisa (a janela popup, o dashboard,
// o tooltip da bandeja) lê da mesma fonte sem duplicar esforço.
type Broadcaster struct {
	collector    *Collector
	interval     time.Duration
	processLimit int

	mu     sync.Mutex
	latest Snapshot
	subs   map[chan Snapshot]struct{}
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
func (broadcaster *Broadcaster) Run(ctx context.Context) {
	ticker := time.NewTicker(broadcaster.interval)
	defer ticker.Stop()

	broadcaster.tick()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			broadcaster.tick()
		}
	}
}

func (broadcaster *Broadcaster) tick() {
	snapshotData, collectionError := broadcaster.collector.Snapshot(broadcaster.processLimit)
	if collectionError != nil {
		log.Printf("metrics: failed to collect snapshot: %v", collectionError)
		return
	}

	broadcaster.mu.Lock()
	broadcaster.latest = snapshotData
	for subscriberChannel := range broadcaster.subs {
		select {
		case subscriberChannel <- snapshotData:
		default:
			// Assinante lento: descarta esta amostra em vez de bloquear o
			// coletor. O painel é ao vivo, uma amostra perdida não importa.
		}
	}
	broadcaster.mu.Unlock()
}

// Latest retorna o snapshot mais recente sem esperar o próximo tick. É
// suficiente pra bandeja, que consulta na sua própria cadência mais lenta.
func (broadcaster *Broadcaster) Latest() Snapshot {
	broadcaster.mu.Lock()
	defer broadcaster.mu.Unlock()
	return broadcaster.latest
}

// Subscribe registra um canal que recebe todo snapshot futuro. Chame a
// função retornada quando terminar, pra não vazar o canal.
func (broadcaster *Broadcaster) Subscribe() (<-chan Snapshot, func()) {
	subscriberChannel := make(chan Snapshot, 1)
	broadcaster.mu.Lock()
	broadcaster.subs[subscriberChannel] = struct{}{}
	broadcaster.mu.Unlock()

	unsubscribe := func() {
		broadcaster.mu.Lock()
		delete(broadcaster.subs, subscriberChannel)
		broadcaster.mu.Unlock()
	}
	return subscriberChannel, unsubscribe
}
