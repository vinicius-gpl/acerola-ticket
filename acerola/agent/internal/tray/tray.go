// Package tray roda a presença do agente na bandeja do Windows: um ícone
// com menu mostrando as métricas atuais, um atalho pra abrir o painel web e
// uma ação de sair.
package tray

import (
	"fmt"
	"log"
	"os/exec"
	"time"

	"fyne.io/systray"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/internal/assets"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/internal/metrics"
)

const refreshInterval = 2 * time.Second

// Run bloqueia até a bandeja ser encerrada (pelo menu ou por
// systray.Quit()). Precisa rodar na goroutine principal — é uma exigência
// do systray/da plataforma no Windows. Lê do broadcaster em vez de chamar o
// coletor direto, pra nunca competir com a amostragem do painel web.
func Run(broadcaster *metrics.Broadcaster, dashboardURL string) {
	systray.Run(
		func() { onReady(broadcaster, dashboardURL) },
		func() {},
	)
}

type items struct {
	host      *systray.MenuItem
	ip        *systray.MenuItem
	os        *systray.MenuItem
	cpu       *systray.MenuItem
	ram       *systray.MenuItem
	disk      *systray.MenuItem
	uptime    *systray.MenuItem
	mac       *systray.MenuItem
	dashboard *systray.MenuItem
	quit      *systray.MenuItem
}

func onReady(broadcaster *metrics.Broadcaster, dashboardURL string) {
	systray.SetIcon(assets.TrayICO)
	systray.SetTitle("")
	systray.SetTooltip("Acerola Agent")

	header := systray.AddMenuItem("Acerola Agent", "Monitor de sistema local")
	header.Disable()
	systray.AddSeparator()

	it := items{
		host:   systray.AddMenuItem("Computador: ...", ""),
		ip:     systray.AddMenuItem("IP local: ...", ""),
		os:     systray.AddMenuItem("Sistema: ...", ""),
		cpu:    systray.AddMenuItem("CPU: ...", ""),
		ram:    systray.AddMenuItem("Memória: ...", ""),
		disk:   systray.AddMenuItem("Disco: ...", ""),
		uptime: systray.AddMenuItem("Ligado há: ...", ""),
		mac:    systray.AddMenuItem("MAC: ...", ""),
	}
	for _, item := range []*systray.MenuItem{it.host, it.ip, it.os, it.cpu, it.ram, it.disk, it.uptime, it.mac} {
		item.Disable()
	}

	systray.AddSeparator()
	it.dashboard = systray.AddMenuItem("Abrir dashboard", "Abre o painel detalhado no navegador")
	it.quit = systray.AddMenuItem("Sair", "Encerra o agente")

	go watchClicks(it, dashboardURL)
	go refreshLoop(broadcaster, it)
}

func watchClicks(it items, dashboardURL string) {
	for {
		select {
		case <-it.dashboard.ClickedCh:
			openBrowser(dashboardURL)
		case <-it.quit.ClickedCh:
			systray.Quit()
			return
		}
	}
}

// refreshLoop mantém os rótulos do menu atualizados, consultando o snapshot
// mais recente do broadcaster na sua própria cadência (mais lenta).
func refreshLoop(broadcaster *metrics.Broadcaster, it items) {
	ticker := time.NewTicker(refreshInterval)
	defer ticker.Stop()

	update(broadcaster, it)
	for range ticker.C {
		update(broadcaster, it)
	}
}

func update(broadcaster *metrics.Broadcaster, it items) {
	snap := broadcaster.Latest()
	if snap.Host.Hostname == "" {
		return // primeira amostra ainda não chegou
	}

	it.host.SetTitle(fmt.Sprintf("Computador: %s", snap.Host.Hostname))
	it.ip.SetTitle(fmt.Sprintf("IP local: %s", orDash(snap.Host.LocalIP)))
	it.os.SetTitle(fmt.Sprintf("Sistema: %s (%s)", snap.Host.Platform, snap.Host.Arch))
	it.cpu.SetTitle(fmt.Sprintf("CPU: %.0f%%", snap.CPU.PercentTotal))
	it.ram.SetTitle(fmt.Sprintf("Memória: %.0f%% (%s de %s)",
		snap.Memory.UsedPercent, humanizeBytes(snap.Memory.UsedBytes), humanizeBytes(snap.Memory.TotalBytes)))
	it.disk.SetTitle(fmt.Sprintf("Disco: %s livres de %s",
		humanizeBytes(snap.Host.FreeDiskBytes), humanizeBytes(snap.Host.TotalDiskBytes)))
	it.uptime.SetTitle(fmt.Sprintf("Ligado há: %s", humanizeUptime(snap.Host.UptimeSeconds)))
	it.mac.SetTitle(fmt.Sprintf("MAC: %s", orDash(snap.Host.MACAddress)))
}

func orDash(s string) string {
	if s == "" {
		return "—"
	}
	return s
}

// openBrowser chama o manipulador de URL do Windows. Não existe um jeito
// portável na stdlib de abrir o navegador padrão, e esta fase é só pra
// Windows, então uma única implementação basta (veja docs/ROADMAP.md).
func openBrowser(url string) {
	if err := exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start(); err != nil {
		log.Printf("tray: failed to open browser: %v", err)
	}
}
