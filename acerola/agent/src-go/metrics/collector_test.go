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

// chromeLikeInstances imita o caso que motivou o agrupamento: um navegador
// com vários processos, cada um pequeno, que somados pesam muito.
func chromeLikeInstances() []namedInstance {
	return []namedInstance{
		{name: "chrome.exe", instance: ProcessInstance{PID: 10, CPUPercent: 3, MemPercent: 1, MemBytes: 400}},
		{name: "explorer.exe", instance: ProcessInstance{PID: 20, CPUPercent: 9, MemPercent: 4, MemBytes: 150}},
		{name: "chrome.exe", instance: ProcessInstance{PID: 11, CPUPercent: 8, MemPercent: 2, MemBytes: 1200}},
		{name: "chrome.exe", instance: ProcessInstance{PID: 12, CPUPercent: 1, MemPercent: 3, MemBytes: 1000}},
	}
}

func TestTopProcessGroupsSumsSameExecutable(testingContext *testing.T) {
	// feliz: os três chrome.exe viram um grupo só, com CPU e memória somadas
	groups := topProcessGroups(chromeLikeInstances(), 10)

	var chrome *ProcessStats
	for index := range groups {
		if groups[index].Name == "chrome.exe" {
			chrome = &groups[index]
		}
	}

	if chrome == nil {
		testingContext.Fatal("chrome.exe group not found")
	}

	if chrome.InstanceCount != 3 {
		testingContext.Errorf("instance count = %d, want 3", chrome.InstanceCount)
	}

	expectedMemBytes := uint64(2600)
	if chrome.MemBytes != expectedMemBytes {
		testingContext.Errorf("memory = %d, want %d", chrome.MemBytes, expectedMemBytes)
	}

	expectedCPU := 12.0
	if chrome.CPUPercent != expectedCPU {
		testingContext.Errorf("cpu = %f, want %f", chrome.CPUPercent, expectedCPU)
	}
}

func TestTopProcessGroupsSortsByTotalCPU(testingContext *testing.T) {
	// feliz: o grupo ganha da soma, não do maior processo isolado — chrome (12%) passa o explorer (9%)
	groups := topProcessGroups(chromeLikeInstances(), 10)

	if len(groups) != 2 {
		testingContext.Fatalf("group count = %d, want 2", len(groups))
	}

	if groups[0].Name != "chrome.exe" {
		testingContext.Errorf("first group = %q, want %q", groups[0].Name, "chrome.exe")
	}
}

func TestTopProcessGroupsSortsInstancesByCPU(testingContext *testing.T) {
	// feliz: dentro do grupo o processo mais pesado vem primeiro, que é a ordem útil pra investigar
	groups := topProcessGroups(chromeLikeInstances(), 10)

	instances := groups[0].Instances
	for index := 1; index < len(instances); index++ {
		if instances[index-1].CPUPercent < instances[index].CPUPercent {
			testingContext.Errorf("instances out of order at %d: %f before %f",
				index, instances[index-1].CPUPercent, instances[index].CPUPercent)
		}
	}
}

func TestTopProcessGroupsRespectsLimit(testingContext *testing.T) {
	// feliz: o limite corta grupos, não processos soltos — senão um app com muitos processos ocuparia a lista toda
	groups := topProcessGroups(chromeLikeInstances(), 1)

	if len(groups) != 1 {
		testingContext.Fatalf("group count = %d, want 1", len(groups))
	}

	if groups[0].InstanceCount != 3 {
		testingContext.Errorf("instance count = %d, want 3 (group must stay whole)", groups[0].InstanceCount)
	}
}

func TestTopProcessGroupsWithoutInstances(testingContext *testing.T) {
	// triste: sem processos legíveis a lista vem vazia, não nil-com-lixo nem panic
	groups := topProcessGroups(nil, 10)

	if len(groups) != 0 {
		testingContext.Errorf("group count = %d, want 0", len(groups))
	}
}

func TestTopProcessGroupsWithZeroLimit(testingContext *testing.T) {
	// triste: limite zero ou negativo não devolve grupo nenhum (caso limite)
	if groups := topProcessGroups(chromeLikeInstances(), 0); groups != nil {
		testingContext.Errorf("groups = %v, want nil for zero limit", groups)
	}

	if groups := topProcessGroups(chromeLikeInstances(), -5); groups != nil {
		testingContext.Errorf("groups = %v, want nil for negative limit", groups)
	}
}
