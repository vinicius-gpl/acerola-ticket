package main

import (
	"testing"
	"time"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/screen"
)

func TestNewAppInstanceHappyPath(testingContext *testing.T) {
	// feliz: a inicialização do app aloca canais e broadcaster com limites válidos
	applicationInstance := NewApp()

	if applicationInstance == nil {
		testingContext.Fatal("esperava instância válida de App, mas veio nil")
	}

	if applicationInstance.broadcaster == nil {
		testingContext.Error("broadcaster de métricas não deveria ser nil")
	}

	if applicationInstance.actions == nil {
		testingContext.Error("canal de ações de janela não deveria ser nil")
	}

	if applicationInstance.viewReady == nil {
		testingContext.Error("canal viewReady não deveria ser nil")
	}
}

func TestAppDimensionsAndConstants(testingContext *testing.T) {
	// feliz: as dimensões configuradas para modo minificado e expandido devem ser positivas e consistentes
	if popupWidth <= 0 || popupHeight <= 0 {
		testingContext.Errorf("dimensões do popup inválidas: width=%d, height=%d", popupWidth, popupHeight)
	}

	if dashboardWidth <= popupWidth {
		testingContext.Errorf("dashboardWidth (%d) deveria ser maior que popupWidth (%d)", dashboardWidth, popupWidth)
	}

	if dashboardHeight <= 0 {
		testingContext.Errorf("dashboardHeight inválido: %d", dashboardHeight)
	}

	expectedMargin := 16
	if screenMargin != expectedMargin {
		testingContext.Errorf("screenMargin = %d, want %d", screenMargin, expectedMargin)
	}
}

func TestViewReadySignalChannel(testingContext *testing.T) {
	// feliz: chamar ViewReady preenche o buffer sem bloquear a goroutine
	applicationInstance := NewApp()

	applicationInstance.ViewReady()

	select {
	case <-applicationInstance.viewReady:
		// Notificação recebida com sucesso
	case <-time.After(100 * time.Millisecond):
		testingContext.Error("esperava sinal no canal viewReady após chamada")
	}
}

func TestViewReadyBufferNonBlocking(testingContext *testing.T) {
	// triste: chamadas subsequentes a ViewReady com o canal já cheio não devem bloquear (caso limite)
	applicationInstance := NewApp()

	// Primeira chamada consome o buffer de tamanho 1
	applicationInstance.ViewReady()

	doneNotification := make(chan struct{})
	go func() {
		applicationInstance.ViewReady() // Segunda chamada com buffer cheio
		close(doneNotification)
	}()

	select {
	case <-doneNotification:
		// Não travou, seguiu com segurança
	case <-time.After(200 * time.Millisecond):
		testingContext.Fatal("ViewReady bloqueou a execução quando o buffer já estava cheio")
	}
}

func TestPlacementAnchorsBottomRight(testingContext *testing.T) {
	// feliz: no monitor principal a janela encosta no canto inferior direito, respeitando a margem
	area := screen.Area{X: 0, Y: 0, Width: 1920, Height: 1040, Scale: 1}

	x, y, width, height := placement(area, popupWidth, popupHeight)

	expectedX := 1920 - popupWidth - screenMargin
	expectedY := 1040 - popupHeight - screenMargin
	if x != expectedX || y != expectedY {
		testingContext.Errorf("position = (%d, %d), want (%d, %d)", x, y, expectedX, expectedY)
	}

	if width != popupWidth || height != popupHeight {
		testingContext.Errorf("size = (%d, %d), want (%d, %d)", width, height, popupWidth, popupHeight)
	}
}

func TestPlacementOnSecondMonitor(testingContext *testing.T) {
	// feliz: num monitor à direita do principal a janela nasce dentro dele, não no primeiro
	area := screen.Area{X: 1920, Y: 0, Width: 1920, Height: 1040, Scale: 1}

	x, _, width, _ := placement(area, dashboardWidth, dashboardHeight)

	if x < area.X {
		testingContext.Errorf("window landed on the wrong monitor: x=%d, monitor starts at %d", x, area.X)
	}

	expectedX := area.X + area.Width - dashboardWidth - screenMargin
	if x != expectedX {
		testingContext.Errorf("position X = %d, want %d", x, expectedX)
	}

	if x+width > area.X+area.Width {
		testingContext.Errorf("window overflowed to the right: x=%d, width=%d, limit=%d", x, width, area.X+area.Width)
	}
}

func TestPlacementScalesWithMonitorZoom(testingContext *testing.T) {
	// feliz: num monitor a 150% o tamanho físico cresce junto, senão a janela sairia pequena
	area := screen.Area{X: 0, Y: 0, Width: 2880, Height: 1560, Scale: 1.5}

	_, _, width, height := placement(area, popupWidth, popupHeight)

	expectedWidth := 570  // 380 * 1.5
	expectedHeight := 975 // 650 * 1.5
	if width != expectedWidth || height != expectedHeight {
		testingContext.Errorf("size = (%d, %d), want (%d, %d)", width, height, expectedWidth, expectedHeight)
	}
}

func TestPlacementClampsHeightOnShortScreen(testingContext *testing.T) {
	// triste: numa tela baixa a janela encolhe pra caber entre as margens em vez de vazar (caso limite)
	area := screen.Area{X: 0, Y: 0, Width: 1366, Height: 600, Scale: 1}

	_, y, _, height := placement(area, popupWidth, popupHeight)

	maximumHeight := area.Height - (screenMargin * 2)
	if height > maximumHeight {
		testingContext.Errorf("height = %d, want at most %d", height, maximumHeight)
	}

	if y < 0 {
		testingContext.Errorf("window overflowed past the top: y=%d", y)
	}
}

func TestScaledRounding(testingContext *testing.T) {
	// feliz: a conversão de pixel lógico pra físico arredonda em vez de truncar
	if got := scaled(16, 1.25); got != 20 {
		testingContext.Errorf("scaled(16, 1.25) = %d, want 20", got)
	}

	// triste: escala quebrada (125% sobre número ímpar) não pode derrubar meio pixel pra baixo
	if got := scaled(15, 1.1); got != 17 {
		testingContext.Errorf("scaled(15, 1.1) = %d, want 17", got)
	}
}
