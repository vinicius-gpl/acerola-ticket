package main

import (
	"testing"
	"time"
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
