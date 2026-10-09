//go:build !windows

package tray

import (
	"fyne.io/systray"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/assets"
)

// icon devolve o ícone em PNG: fora do Windows a bandeja não lê .ico.
func icon() []byte {
	return assets.TrayPNG
}

// allowForeground não tem o que fazer fora do Windows: a trava de "roubo de
// foco" que ela contorna é da API de janelas do Windows.
func allowForeground() {}

// popupMenuClicks cria a entrada "Abrir Minificado" no menu. Fora do Windows
// o clique simples no ícone não é nosso: quem decide é o ambiente gráfico, e
// no GNOME (extensão AppIndicator) ele abre o menu — a telinha só viria com
// clique duplo, que ninguém adivinha. A entrada dá um caminho à vista.
func popupMenuClicks() <-chan struct{} {
	return systray.AddMenuItem("Abrir Minificado", "Abre a telinha rápida").ClickedCh
}
