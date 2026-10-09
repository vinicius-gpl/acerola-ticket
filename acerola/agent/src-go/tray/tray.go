// Package tray roda a presença do agente na bandeja do Windows. Clique
// esquerdo no ícone abre a popup (a "telinha" da própria janela Wails);
// clique direito mostra o menu nativo de texto (Abrir Dashboard, Sair) — o
// systray já cai automaticamente no menu quando não há um handler de clique
// direito registrado, então não precisamos montar isso na mão.
package tray

import "fyne.io/systray"

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
	systray.SetIcon(icon())
	systray.SetTooltip("Acerola Agent")
	systray.SetOnTapped(func() {
		// Precisa acontecer aqui, na thread da bandeja, ao receber o clique
		// nativo (ver allowForeground).
		allowForeground()
		callbacks.ShowPopup()
	})

	// Vem antes dos outros para ser a primeira entrada do menu, onde existir.
	popupClicks := popupMenuClicks()
	dashboardItem := systray.AddMenuItem("Abrir Dashboard", "Abre o painel completo")
	quitItem := systray.AddMenuItem("Sair", "Encerra o agente")

	go watchMenu(popupClicks, dashboardItem, quitItem, callbacks)
}

// watchMenu recebe os cliques de "Abrir Minificado" como canal solto porque
// a entrada só existe em alguns sistemas (ver popupMenuClicks): onde não
// existe o canal é nil, e um canal nil nunca dispara no select.
func watchMenu(popupClicks <-chan struct{}, dashboardItem, quitItem *systray.MenuItem, callbacks Callbacks) {
	for {
		select {
		case <-popupClicks:
			callbacks.ShowPopup()
		case <-dashboardItem.ClickedCh:
			callbacks.ShowDashboard()
		case <-quitItem.ClickedCh:
			callbacks.Quit()
			return
		}
	}
}
