// Package tray roda a presença do agente na bandeja do Windows. Clique
// esquerdo no ícone abre a popup (a "telinha" da própria janela Wails);
// clique direito mostra o menu nativo de texto (Configurar chave, Abrir
// Dashboard, Sair) — o systray já cai automaticamente no menu quando não há um
// handler de clique direito registrado, então não precisamos montar isso na
// mão.
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

	/* Esta janela também entra no menu, e não só no clique esquerdo: em algumas
	   máquinas o clique no ícone não chega até aqui (a bandeja escondida do
	   Windows, por exemplo, engole o toque). A entrada leva o nome do motivo de
	   alguém abri-la numa máquina recém-instalada: colar a chave. */
	popupItem := systray.AddMenuItem("Configurar chave", "Abre a tela onde se cola a chave desta máquina")
	dashboardItem := systray.AddMenuItem("Abrir Dashboard", "Abre o painel completo")
	systray.AddSeparator()
	quitItem := systray.AddMenuItem("Sair", "Encerra o agente")

	go watchMenu(menuItems{popup: popupItem, dashboard: dashboardItem, quit: quitItem}, callbacks)
}

// menuItems são as entradas do menu do botão direito. Agrupadas num struct
// porque três parâmetros do mesmo tipo em sequência é um convite a trocar a
// ordem sem o compilador reclamar.
type menuItems struct {
	popup     *systray.MenuItem
	dashboard *systray.MenuItem
	quit      *systray.MenuItem
}

func watchMenu(items menuItems, callbacks Callbacks) {
	for {
		select {
		case <-items.popup.ClickedCh:
			callbacks.ShowPopup()
		case <-items.dashboard.ClickedCh:
			callbacks.ShowDashboard()
		case <-items.quit.ClickedCh:
			callbacks.Quit()
			return
		}
	}
}
