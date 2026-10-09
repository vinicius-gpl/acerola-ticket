package tray

import (
	"golang.org/x/sys/windows"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/assets"
)

var (
	user32                       = windows.NewLazySystemDLL("user32.dll")
	procAllowSetForegroundWindow = user32.NewProc("AllowSetForegroundWindow")
)

// icon devolve o ícone no formato que a bandeja do Windows exige: .ico.
func icon() []byte {
	return assets.TrayICO
}

// allowForeground autoriza explicitamente nosso processo a trazer a janela
// para o primeiro plano, mesmo se o foco do usuário estava em outro monitor
// ou aplicativo. Precisa rodar na thread da bandeja, ao receber o clique.
func allowForeground() {
	_, _, _ = procAllowSetForegroundWindow.Call(uintptr(windows.GetCurrentProcessId()))
}

// popupMenuClicks não cria entrada nenhuma no Windows: lá o clique esquerdo
// no ícone já abre a telinha, e repetir isso no menu seria ruído.
func popupMenuClicks() <-chan struct{} {
	return nil
}
