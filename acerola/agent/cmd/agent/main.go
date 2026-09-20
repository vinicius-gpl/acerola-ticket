// Command agent is the entry point: it starts the metrics broadcaster, the
// local web dashboard, and the system tray, then blocks on the tray (which
// owns the main goroutine, as systray requires on Windows).
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
		log.Printf("dashboard local em http://%s", dashboardAddr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("erro no servidor web: %v", err)
		}
	}()

	dashboardURL := fmt.Sprintf("http://%s", dashboardAddr)
	tray.Run(broadcaster, dashboardURL)
}
