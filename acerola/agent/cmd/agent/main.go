// Command agent é o ponto de entrada: inicia o broadcaster de métricas, o
// painel web local e a bandeja do sistema, e então bloqueia na bandeja (que
// é dona da goroutine principal, como o systray exige no Windows).
package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/internal/metrics"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/internal/tray"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/internal/webserver"
)

const (
	dashboardAddr   = "127.0.0.1:8098"
	sampleInterval  = 1 * time.Second
	topProcessCount = 25
)

func main() {
	collector := metrics.New()
	broadcaster := metrics.NewBroadcaster(collector, sampleInterval, topProcessCount)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go broadcaster.Run(ctx)

	server := webserver.New(dashboardAddr, broadcaster)
	go func() {
		log.Printf("local dashboard at http://%s", dashboardAddr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("web server error: %v", err)
		}
	}()

	dashboardURL := fmt.Sprintf("http://%s", dashboardAddr)
	tray.Run(broadcaster, dashboardURL)
}
