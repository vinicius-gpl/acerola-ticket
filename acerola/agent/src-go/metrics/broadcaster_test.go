package metrics

import (
	"testing"
	"time"
)

func TestBroadcasterSubscriptionHappyPath(testingContext *testing.T) {
	// feliz: assinante se registra, recebe snapshots e cancela assinatura corretamente
	metricsCollector := New()
	samplingInterval := time.Second
	processLimit := 0 // zero processos para coleta leve e rápida no teste unitário
	broadcasterInstance := NewBroadcaster(metricsCollector, samplingInterval, processLimit)

	subscriptionChannel, unsubscribeCallback := broadcasterInstance.Subscribe()
	defer unsubscribeCallback()

	if subscriptionChannel == nil {
		testingContext.Fatal("esperava canal de assinatura válido, veio nil")
	}

	// Dispara uma rodada de coleta e distribuição
	broadcasterInstance.tick()

	select {
	case receivedSnapshot := <-subscriptionChannel:
		if receivedSnapshot.Timestamp.IsZero() {
			testingContext.Error("snapshot recebido não deveria ter timestamp zero")
		}
	case <-time.After(3 * time.Second):
		testingContext.Fatal("timeout esperando snapshot do broadcaster")
	}
}

func TestBroadcasterLatestEmptyInitial(testingContext *testing.T) {
	// triste: antes de qualquer coleta, Latest retorna snapshot vazio sem travar
	metricsCollector := New()
	broadcasterInstance := NewBroadcaster(metricsCollector, time.Second, 10)

	initialSnapshot := broadcasterInstance.Latest()
	if !initialSnapshot.Timestamp.IsZero() {
		testingContext.Error("snapshot inicial antes de tick deveria ter timestamp zero")
	}
}

func TestBroadcasterUnsubscribe(testingContext *testing.T) {
	// feliz: ao desinscrever, o canal é removido do mapa de assinantes
	metricsCollector := New()
	broadcasterInstance := NewBroadcaster(metricsCollector, time.Second, 10)

	_, unsubscribeCallback := broadcasterInstance.Subscribe()
	if len(broadcasterInstance.subs) != 1 {
		testingContext.Errorf("esperava 1 assinante, obteve %d", len(broadcasterInstance.subs))
	}

	unsubscribeCallback()

	if len(broadcasterInstance.subs) != 0 {
		testingContext.Errorf("esperava 0 assinantes após desinscrição, obteve %d", len(broadcasterInstance.subs))
	}
}
