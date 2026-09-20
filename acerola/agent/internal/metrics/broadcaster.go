package metrics

import (
	"context"
	"log"
	"sync"
	"time"
)

// Broadcaster is the single place that calls Collector.Snapshot on a timer
// and fans the result out to any number of subscribers (the tray and every
// connected dashboard websocket).
//
// This matters because gopsutil's non-blocking cpu.Percent(0, ...) keeps its
// "time of last call" in a package-level variable. If the tray and the web
// dashboard each called Collector.Snapshot on their own ticker, they would
// race on that shared state and report wrong CPU percentages. Centralizing
// collection here means Snapshot is only ever called from one goroutine.
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

// Run collects and broadcasts until ctx is cancelled. Call it once, in its
// own goroutine.
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
		log.Printf("metrics: falha ao coletar snapshot: %v", err)
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

// Latest returns the most recent snapshot without waiting for the next
// tick. Good enough for the tray, which polls at its own slower cadence.
func (b *Broadcaster) Latest() Snapshot {
	b.mu.Lock()
	defer b.mu.Unlock()
	return b.latest
}

// Subscribe registers a channel that receives every future snapshot. Call
// the returned function when done to avoid leaking the channel.
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
