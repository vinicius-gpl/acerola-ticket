package desktop

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/modules/settings"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/lib/infra/machine"
	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/modules/reporting"
)

// reportToDashboard liga o envio para o painel central, quando esta máquina
// foi configurada para reportar (ver src-go/modules/reporting).
//
// Sem configuração o agente segue exatamente como era: local, mostrando as
// métricas na própria máquina. É de propósito que a falta de configuração não
// seja erro — nem toda instalação deste agente é de uma máquina que o TI
// acompanha pelo painel.
func (app *App) reportToDashboard(ctx context.Context) {
	// O serviço é o dono da conexão quando o instalador de máquina está presente.
	if machine.Installed() {
		log.Print("reporting: managed by Windows service")
		return
	}
	configPath, configPathError := settings.DefaultConfigPath()
	if configPathError != nil {
		log.Printf("reporting: %v", configPathError)
		return
	}

	config, configError := settings.Load(os.Getenv, configPath)
	if errors.Is(configError, settings.ErrNotConfigured) {
		log.Printf("reporting: not configured, running locally only (%s)", configPath)
		return
	}
	if configError != nil {
		log.Printf("reporting: %v", configError)
		return
	}

	app.startReporting(ctx, config)
}

// startReporting sobe o envio, parando o anterior se houver.
func (app *App) startReporting(ctx context.Context, config settings.Config) {
	app.stopReporting()

	reportingContext, stop := context.WithCancel(ctx)
	reporter := reporting.NewReporter(config, app.broadcaster, agentVersion)

	app.mu.Lock()
	app.reporter = reporter
	app.stopReporter = stop
	app.mu.Unlock()

	log.Printf("reporting: sending snapshots to %s every %v", config.ServerURL, config.Interval)
	go reporter.Run(reportingContext)
}

func (app *App) stopReporting() {
	app.mu.Lock()
	stop := app.stopReporter
	app.reporter = nil
	app.stopReporter = nil
	app.mu.Unlock()

	if stop != nil {
		stop()
	}
}

// ReportingSettings é exposto ao frontend (via Bind): o que a tela mostra no
// card do painel central. O TOKEN NÃO SAI daqui — só a informação de que
// existe um salvo. Devolvê-lo recolocaria em texto puro, na memória da tela,
// o segredo que acabou de ser cifrado em disco.
func (app *App) ReportingSettings() settings.Settings {
	if machine.Installed() {
		return machineReportingSettings()
	}

	configPath, configPathError := settings.DefaultConfigPath()
	if configPathError != nil {
		return settings.Settings{}
	}

	return settings.Current(configPath)
}

// ReportingState é exposto ao frontend (via Bind): em que pé está a conexão.
func (app *App) ReportingState() string {
	if machine.Installed() {
		return string(reporting.StateManaged)
	}
	app.mu.RLock()
	reporter := app.reporter
	app.mu.RUnlock()

	if reporter == nil {
		return string(reporting.StateOff)
	}

	return string(reporter.State())
}

// SaveReportingSettings é exposto ao frontend (via Bind): guarda o endereço e
// a chave desta máquina — a chave cifrada — e já reconecta com ela.
//
// A mensagem de erro que volta daqui APARECE NA TELA, então ela é a única
// coisa deste arquivo escrita em português.
func (app *App) SaveReportingSettings(serverURL string, token string) string {
	if machine.Installed() {
		return "Esta instalação é gerenciada pelo TI. Use o script de configuração do serviço."
	}
	configPath, configPathError := settings.DefaultConfigPath()
	if configPathError != nil {
		return "Não consegui achar a pasta de configuração desta máquina."
	}

	config, saveError := settings.Save(configPath, serverURL, token, 0)
	if saveError != nil {
		log.Printf("reporting: %v", saveError)

		return saveMessage(saveError)
	}

	app.mu.RLock()
	ctx := app.ctx
	app.mu.RUnlock()

	app.startReporting(ctx, config)

	return ""
}

// saveMessage traduz a recusa para uma frase que diz O QUE FAZER. O erro
// original vai para o log, em inglês, para quem for investigar.
func saveMessage(saveError error) string {
	switch {
	case strings.Contains(saveError.Error(), "token is missing"):
		return "Cole a chave que o painel mostrou quando o computador foi cadastrado."
	case strings.Contains(saveError.Error(), "server URL is missing"):
		return "Informe o endereço do painel."
	case strings.Contains(saveError.Error(), "server URL"):
		return "O endereço do painel não parece certo. Use o mesmo endereço que você abre no navegador."
	case strings.Contains(saveError.Error(), "protect"):
		return "Não consegui guardar a chave com segurança nesta máquina."
	default:
		return "Não consegui salvar. Tente de novo."
	}
}

func machineReportingSettings() settings.Settings {
	settings := settings.Settings{IntervalSeconds: int(settings.DefaultInterval.Seconds())}
	content, err := os.ReadFile(filepath.Join(machine.Directory(), "machine.json"))
	if err != nil {
		return settings
	}
	var config machine.Config
	if err := json.Unmarshal(content, &config); err != nil {
		return settings
	}
	settings.ServerURL = config.ServerURL
	settings.HasToken = config.TokenCipher != ""
	return settings
}
