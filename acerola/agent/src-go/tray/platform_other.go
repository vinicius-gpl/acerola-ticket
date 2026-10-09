//go:build !windows

package tray

import "github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/assets"

// icon devolve o ícone em PNG: fora do Windows a bandeja não lê .ico.
func icon() []byte {
	return assets.TrayPNG
}

// allowForeground não tem o que fazer fora do Windows: a trava de "roubo de
// foco" que ela contorna é da API de janelas do Windows.
func allowForeground() {}
