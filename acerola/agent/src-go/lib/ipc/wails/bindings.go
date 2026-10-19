// Package wails expõe o contrato IPC usado pela interface do agente.
package wails

import "github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/modules/settings"

// Backend é o contrato implementado pela aplicação desktop.
type Backend interface {
	ShowPopup()
	ShowDashboard()
	ShowSettings()
	HideWindow()
	ViewReady()
	Quit()
	ReportingSettings() settings.Settings
	ReportingState() string
	SaveReportingSettings(string, string) string
}

// Bindings mantém os métodos públicos independentes do ciclo de vida do desktop.
type Bindings struct{ backend Backend }

func New(backend Backend) *Bindings                      { return &Bindings{backend: backend} }
func (b *Bindings) ShowPopup()                           { b.backend.ShowPopup() }
func (b *Bindings) ShowDashboard()                       { b.backend.ShowDashboard() }
func (b *Bindings) ShowSettings()                        { b.backend.ShowSettings() }
func (b *Bindings) HideWindow()                          { b.backend.HideWindow() }
func (b *Bindings) ViewReady()                           { b.backend.ViewReady() }
func (b *Bindings) Quit()                                { b.backend.Quit() }
func (b *Bindings) ReportingSettings() settings.Settings { return b.backend.ReportingSettings() }
func (b *Bindings) ReportingState() string               { return b.backend.ReportingState() }
func (b *Bindings) SaveReportingSettings(serverURL, token string) string {
	return b.backend.SaveReportingSettings(serverURL, token)
}
