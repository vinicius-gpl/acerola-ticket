package metrics

import "testing"

func TestRate(t *testing.T) {
	// feliz: contador cresceu normalmente entre duas amostras
	got := rate(1000, 3000, 2)
	want := 1000.0 // (3000-1000)/2s
	if got != want {
		t.Errorf("rate(1000, 3000, 2) = %v, want %v", got, want)
	}
}

func TestRateContadorReiniciou(t *testing.T) {
	// triste: o contador do SO reiniciou (ex: adaptador de rede reconectou) e
	// "atual" é menor que "anterior" — não pode dar taxa negativa.
	got := rate(5000, 100, 2)
	if got != 0 {
		t.Errorf("rate com contador reiniciado = %v, want 0", got)
	}
}

func TestRateSemTempoDecorrido(t *testing.T) {
	// triste: elapsedSeconds <= 0 não pode gerar divisão por zero ou negativo.
	got := rate(1000, 2000, 0)
	if got != 0 {
		t.Errorf("rate com elapsed=0 = %v, want 0", got)
	}
}

func TestHasFlag(t *testing.T) {
	flags := []string{"Up", "Broadcast", "Multicast"}

	// feliz: procura por uma flag existente, ignorando maiúsculas/minúsculas
	if !hasFlag(flags, "up") {
		t.Error("hasFlag deveria achar \"up\" case-insensitive")
	}
}

func TestHasFlagAusente(t *testing.T) {
	// triste: flag que não está na lista
	flags := []string{"Up", "Broadcast"}
	if hasFlag(flags, "loopback") {
		t.Error("hasFlag não deveria achar \"loopback\" nessa lista")
	}
}
