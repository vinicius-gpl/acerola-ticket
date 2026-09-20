// Command acerola-agent é o ponto de entrada do app Wails. Wails exige que
// main.go e app.go fiquem na raiz do projeto — não há como movê-los pra
// src-go/ (ver docs/ARQUITETURA.md); todo o resto do código Go mora lá.
package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:svelte/dist
var assets embed.FS

func main() {
	app := NewApp()

	// A janela some ao perder o foco (ver svelte/src/views/popup) e volta via
	// clique na bandeja — nunca fecha o processo sozinha: nasce escondida, e
	// HideWindowOnClose faz até o Alt+F4/clique no X só esconder. Quem
	// encerra de fato é "Sair" no menu da bandeja (ver app.go, startup).
	err := wails.Run(&options.App{
		Title:             "Acerola Agent",
		Width:             380,
		Height:            812,
		MinWidth:          320,
		MinHeight:         300,
		Frameless:         true,
		StartHidden:       true,
		HideWindowOnClose: true,
		BackgroundColour:  &options.RGBA{R: 30, G: 30, B: 46, A: 1}, // catppuccin mocha --base
		AssetServer:       &assetserver.Options{Assets: assets},
		OnStartup:         app.startup,
		Bind:              []interface{}{app},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
