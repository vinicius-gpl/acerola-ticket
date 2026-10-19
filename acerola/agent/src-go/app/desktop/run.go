package desktop

import (
	"flag"
	"io/fs"
	"os"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/lib/desktop/window"
	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

func configureWebView() {
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

func Run(assets fs.FS, app *App, binding interface{}) {
	configureWebView()
	background := flag.Bool("background", false, "Start minimized in system tray")
	flag.Parse()

	handleSingleInstance(*background)

	agentApp := app
	agentApp.SetStartupOpen(!*background)

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
		OnDomReady:        agentApp.domReady,
		Bind:              []interface{}{binding},
		Windows: &windows.Options{
			WebviewGpuIsDisabled: true,
			// Nome de classe próprio em vez do "wailsWindow" padrão: é por
			// ele que o pacote src-go/lib/desktop/window encontra o handle da janela
			// nativa, que o Wails não expõe (ver window.ClassName).
			WindowClassName: window.ClassName,
		},
		Linux: &linux.Options{
			// No Linux ninguém arredonda a janela por nós (no Windows 11 é o
			// próprio sistema): a janela nasce transparente e quem desenha
			// o canto arredondado é a página (ver tailwind.css,
			// data-platform='linux').
			WindowIsTranslucent: true,
		},
	})
	if runError != nil {
		println("Error:", runError.Error())
	}
}
