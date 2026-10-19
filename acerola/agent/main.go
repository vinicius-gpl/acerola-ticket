// Command Acerola Agent mantém só a entrada e o contrato de bindings do Wails.
package main

import (
	"embed"

	ipc "github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/lib/ipc/wails"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/app/desktop"
)

//go:embed all:svelte/dist
var assets embed.FS

// App preserva window.go.main.App para os bindings existentes do frontend.
type App struct{ *ipc.Bindings }

func main() {
	backend := desktop.NewApp()
	app := &App{Bindings: ipc.New(backend)}
	desktop.Run(assets, backend, app)
}
