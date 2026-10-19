//go:build !windows

package assets

import _ "embed"

// TrayPNG é o mesmo ícone da bandeja em PNG: fora do Windows o
// fyne.io/systray não lê .ico (ver docs/icons.md).
//
//go:embed tray.png
var TrayPNG []byte
