// Package tray roda a presença do agente na bandeja do Windows. Clique
// esquerdo no ícone abre a popup (a "telinha" da própria janela Wails);
// clique direito mostra o menu nativo de texto (Abrir Dashboard, Sair) — o
// systray já cai automaticamente no menu quando não há um handler de clique
// direito registrado, então não precisamos montar isso na mão.
package tray

import (
	"fyne.io/systray"
	"golang.org/x/sys/windows"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/assets"
)

var (
	user32                       = windows.NewLazySystemDLL("user32.dll")
	procAllowSetForegroundWindow = user32.NewProc("AllowSetForegroundWindow")
)

// Callbacks são as ações que a janela Wails expõe pra bandeja acionar. A
// bandeja não sabe nada sobre janelas, snapshots ou WebView — só chama essas
// funções.
type Callbacks struct {
	ShowPopup     func()
	ShowDashboard func()
	Quit          func()
}

// Run bloqueia até a bandeja ser encerrada. Precisa rodar numa goroutine com
// vida própria (trava sua própria thread do SO por dentro), independente da
// goroutine que sobe a janela Wails.
func Run(callbacks Callbacks) {
	systray.Run(
		func() { onReady(callbacks) },
		func() {},
	)
}

func onReady(callbacks Callbacks) {
	systray.SetIcon(assets.TrayICO)
	systray.SetTooltip("Acerola Agent")
	systray.SetOnTapped(func() {
		// Ao receber o clique nativo na thread da bandeja, autoriza explicitamente
		// nosso processo a trazer a janela para o primeiro plano, mesmo se o foco
		// do usuário estava em outro monitor ou aplicativo.
		_, _, _ = procAllowSetForegroundWindow.Call(uintptr(windows.GetCurrentProcessId()))
		callbacks.ShowPopup()
	})

	dashboardItem := systray.AddMenuItem("Abrir Dashboard", "Abre o painel completo")
	quitItem := systray.AddMenuItem("Sair", "Encerra o agente")

	go watchMenu(dashboardItem, quitItem, callbacks)
}

func watchMenu(dashboardItem, quitItem *systray.MenuItem, callbacks Callbacks) {
	for {
		select {
		case <-dashboardItem.ClickedCh:
			callbacks.ShowDashboard()
		case <-quitItem.ClickedCh:
			callbacks.Quit()
			return
		}
	}
}
