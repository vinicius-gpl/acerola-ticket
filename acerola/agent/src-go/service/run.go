// Package service mantém a coleta e as atualizações independentes da sessão gráfica.
package service

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/machine"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/metrics"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/reporting"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/updater"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/version"
)

func Run(ctx context.Context) {
	directory := machine.Directory()
	broadcaster := metrics.NewBroadcaster(metrics.New(), time.Second, 25)
	go broadcaster.Run(ctx)
	go updateLoop(ctx, directory)
	var previous reporting.Config
	var stop context.CancelFunc
	defer func() {
		if stop != nil {
			stop()
		}
	}()
	for {
		_, config, err := machine.LoadTrusted(filepath.Join(directory, "machine.json"))
		if err == nil && config != previous {
			if stop != nil {
				stop()
			}
			stop = startReporter(ctx, config, broadcaster)
			previous = config
			log.Printf("service: reporting configured (version %s)", version.Current)
		}
		if err != nil && !os.IsNotExist(err) {
			log.Printf("service: %v", err)
		}
		if !wait(ctx, time.Minute) {
			return
		}
	}
}

func updateLoop(ctx context.Context, directory string) {
	for {
		interval := 5 * time.Minute
		config, identity, err := machine.LoadTrusted(filepath.Join(directory, "machine.json"))
		if err == nil && config.AutoUpdate {
			client := updater.Client{
				HTTP: updater.HTTPClient(), ServerURL: config.ServerURL, Token: identity.Token,
				Directory: filepath.Join(directory, "updates"), CurrentVersion: version.Current,
				SignerSHA256: config.SignerSHA256, Verify: updater.VerifySignature, Install: updater.Install,
			}
			started, updateError := client.Check(ctx)
			if updateError != nil {
				log.Printf("updater: check failed: %v", updateError)
			}
			if updateError == nil {
				interval = time.Hour
			}
			if started {
				log.Print("updater: validated MSI handed to Windows Installer; see updates/install.log")
			}
		}
		if !wait(ctx, interval) {
			return
		}
	}
}

func wait(ctx context.Context, duration time.Duration) bool {
	timer := time.NewTimer(duration)
	defer timer.Stop()
	select {
	case <-ctx.Done():
		return false
	case <-timer.C:
		return true
	}
}

func startReporter(ctx context.Context, config reporting.Config, broadcaster *metrics.Broadcaster) context.CancelFunc {
	reportContext, stop := context.WithCancel(ctx)
	go reporting.NewReporter(config, broadcaster, version.Current).Run(reportContext)
	return stop
}
