// Command Acerola Agent mantém só a entrada e o contrato de bindings do Wails.
package main

import (
	"embed"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/desktop"
)

//go:embed all:svelte/dist
var assets embed.FS

// App preserva window.go.main.App para os bindings existentes do frontend.
type App struct{ *desktop.App }

func main() {
	app := &App{App: desktop.NewApp()}
	desktop.Run(assets, app.App, app)
}
