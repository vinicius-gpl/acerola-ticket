// Command Acerola Agent é o ponto de entrada do app Wails. Wails exige que
// main.go e app.go fiquem na raiz do projeto — não há como movê-los pra
// src-go/ (ver docs/ARQUITETURA.md); todo o resto do código Go mora lá.
package main

import (
	"embed"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/window"
)

//go:embed all:svelte/dist
var assets embed.FS

func init() {
	// Reduz expressivamente a pegada de memória do Chromium/WebView2:
	// 1. Desativa processos secundários dedicados (GPU e áudio fora de processo)
	// 2. Limita o heap do V8 e caches em disco
	// 3. Força limites rígidos para instâncias em segundo plano
	_ = os.Setenv("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
		"--disable-gpu "+
			"--disable-gpu-compositing "+
			"--in-process-gpu "+
			"--renderer-process-limit=1 "+
			"--disable-features=CalculateNativeWinOcclusion,SpareRendererForSitePerProcess,MediaSessionService,AudioServiceOutOfProcess "+
			"--js-flags=\"--max-old-space-size=32\" "+
			"--disk-cache-size=1 "+
			"--media-cache-size=1 "+
			"--disable-extensions "+
			"--disable-component-update "+
			"--disable-background-networking "+
			"--disable-sync",
	)
}

func main() {
	agentApp := NewApp()

	// A janela some ao perder o foco (ver svelte/src/views/popup) e volta via
	// clique na bandeja — nunca fecha o processo sozinha: nasce escondida, e
	// HideWindowOnClose faz até o Alt+F4/clique no X só esconder. Quem
	// encerra de fato é "Sair" no menu da bandeja (ver app.go, startup).
	runError := wails.Run(&options.App{
		Title:             "Acerola Agent",
		Width:             380,
		Height:            650,
		MinWidth:          320,
		MinHeight:         300,
		Frameless:         true,
		StartHidden:       true,
		HideWindowOnClose: true,
		BackgroundColour:  &options.RGBA{R: 30, G: 30, B: 46, A: 1}, // catppuccin mocha --base
		AssetServer:       &assetserver.Options{Assets: assets},
		OnStartup:         agentApp.startup,
		Bind:              []interface{}{agentApp},
		Windows: &windows.Options{
			WebviewGpuIsDisabled: true,
			// Nome de classe próprio em vez do "wailsWindow" padrão: é por
			// ele que o pacote src-go/window encontra o handle da janela
			// nativa, que o Wails não expõe (ver window.ClassName).
			WindowClassName: window.ClassName,
		},
	})
	if runError != nil {
		println("Error:", runError.Error())
	}
}
