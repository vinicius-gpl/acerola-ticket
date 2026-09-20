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

// menuItems agrupa os itens de menu que a bandeja mantém atualizados.
type menuItems struct {
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

	menu := menuItems{
		host:   systray.AddMenuItem("Computador: ...", ""),
		ip:     systray.AddMenuItem("IP local: ...", ""),
		os:     systray.AddMenuItem("Sistema: ...", ""),
		cpu:    systray.AddMenuItem("CPU: ...", ""),
		ram:    systray.AddMenuItem("Memória: ...", ""),
		disk:   systray.AddMenuItem("Disco: ...", ""),
		uptime: systray.AddMenuItem("Ligado há: ...", ""),
		mac:    systray.AddMenuItem("MAC: ...", ""),
	}
	labels := []*systray.MenuItem{menu.host, menu.ip, menu.os, menu.cpu, menu.ram, menu.disk, menu.uptime, menu.mac}
	for _, label := range labels {
		label.Disable()
	}

	systray.AddSeparator()
	menu.dashboard = systray.AddMenuItem("Abrir dashboard", "Abre o painel detalhado no navegador")
	menu.quit = systray.AddMenuItem("Sair", "Encerra o agente")

	go watchClicks(menu, dashboardURL)
	go refreshLoop(broadcaster, menu)
}

func watchClicks(menu menuItems, dashboardURL string) {
	for {
		select {
		case <-menu.dashboard.ClickedCh:
			openBrowser(dashboardURL)
		case <-menu.quit.ClickedCh:
			systray.Quit()
			return
		}
	}
}

// refreshLoop mantém os rótulos do menu atualizados, consultando o snapshot
// mais recente do broadcaster na sua própria cadência (mais lenta).
func refreshLoop(broadcaster *metrics.Broadcaster, menu menuItems) {
	ticker := time.NewTicker(refreshInterval)
	defer ticker.Stop()

	update(broadcaster, menu)
	for range ticker.C {
		update(broadcaster, menu)
	}
}

func update(broadcaster *metrics.Broadcaster, menu menuItems) {
	snap := broadcaster.Latest()
	if snap.Host.Hostname == "" {
		return // primeira amostra ainda não chegou
	}

	menu.host.SetTitle(fmt.Sprintf("Computador: %s", snap.Host.Hostname))
	menu.ip.SetTitle(fmt.Sprintf("IP local: %s", orDash(snap.Host.LocalIP)))
	menu.os.SetTitle(fmt.Sprintf("Sistema: %s (%s)", snap.Host.Platform, snap.Host.Arch))
	menu.cpu.SetTitle(fmt.Sprintf("CPU: %.0f%%", snap.CPU.PercentTotal))
	menu.ram.SetTitle(fmt.Sprintf("Memória: %.0f%% (%s de %s)",
		snap.Memory.UsedPercent, humanizeBytes(snap.Memory.UsedBytes), humanizeBytes(snap.Memory.TotalBytes)))
	menu.disk.SetTitle(fmt.Sprintf("Disco: %s livres de %s",
		humanizeBytes(snap.Host.FreeDiskBytes), humanizeBytes(snap.Host.TotalDiskBytes)))
	menu.uptime.SetTitle(fmt.Sprintf("Ligado há: %s", humanizeUptime(snap.Host.UptimeSeconds)))
	menu.mac.SetTitle(fmt.Sprintf("MAC: %s", orDash(snap.Host.MACAddress)))
}

func orDash(value string) string {
	if value == "" {
		return "—"
	}
	return value
}

// openBrowser chama o manipulador de URL do Windows. Não existe um jeito
// portável na stdlib de abrir o navegador padrão, e esta fase é só pra
// Windows, então uma única implementação basta (veja docs/ROADMAP.md).
func openBrowser(url string) {
	if err := exec.Command("rundll32", "url.dll,FileProtocolHandler", url).Start(); err != nil {
		log.Printf("tray: failed to open browser: %v", err)
	}
}
