package metrics

import "testing"

func TestRateHappyPath(testingContext *testing.T) {
	// feliz: contador cresceu normalmente entre duas amostras
	calculatedRate := rate(1000, 3000, 2)
	expectedRate := 1000.0 // (3000-1000)/2s
	if calculatedRate != expectedRate {
		testingContext.Errorf("rate(1000, 3000, 2) = %v, want %v", calculatedRate, expectedRate)
	}
}

func TestRateCounterReset(testingContext *testing.T) {
	// triste: o contador do SO reiniciou (ex: adaptador de rede reconectou) e
	// "atual" é menor que "anterior" — não pode dar taxa negativa.
	calculatedRate := rate(5000, 100, 2)
	if calculatedRate != 0 {
		testingContext.Errorf("rate com contador reiniciado = %v, want 0", calculatedRate)
	}
}

func TestRateZeroElapsed(testingContext *testing.T) {
	// triste: elapsedSeconds <= 0 não pode gerar divisão por zero ou negativo.
	calculatedRate := rate(1000, 2000, 0)
	if calculatedRate != 0 {
		testingContext.Errorf("rate com elapsed=0 = %v, want 0", calculatedRate)
	}
}

func TestHasFlagMatchingCaseInsensitive(testingContext *testing.T) {
	flagList := []string{"Up", "Broadcast", "Multicast"}

	// feliz: procura por uma flag existente, ignorando maiúsculas/minúsculas
	if !hasFlag(flagList, "up") {
		testingContext.Error("hasFlag deveria achar \"up\" case-insensitive")
	}
}

func TestHasFlagAbsent(testingContext *testing.T) {
	flagList := []string{"Up", "Broadcast"}

	// triste: flag que não está na lista não deve ser encontrada
	if hasFlag(flagList, "loopback") {
		testingContext.Error("hasFlag não deveria achar \"loopback\" nessa lista")
	}
}
