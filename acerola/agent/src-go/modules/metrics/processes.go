package metrics

import (
	"sort"
	"time"

	"github.com/shirou/gopsutil/v4/process"
)

// namedInstance é um processo recém-lido do sistema, ainda solto. O nome do
// executável é o que vai juntá-lo aos irmãos em topProcessGroups.
type namedInstance struct {
	name     string
	instance ProcessInstance
}

// collectProcesses retorna os `limit` aplicativos que mais consomem CPU, com
// os processos de mesmo executável já somados.
func (collector *Collector) collectProcesses(limit, logicalCPUs int) []ProcessStats {
	if limit <= 0 {
		return nil
	}
	procs, err := process.Processes()
	if err != nil {
		return nil
	}

	return topProcessGroups(collector.readProcessInstances(procs, logicalCPUs), limit)
}

// readProcessInstances lê o que interessa de cada processo. Processos que
// não conseguimos inspecionar (permissão negada, terminou durante a
// varredura) são ignorados silenciosamente — isso é esperado no Windows,
// não uma condição de erro.
//
// Não usamos o `CPUPercent()` do gopsutil de propósito: ele divide o tempo
// de CPU pela idade do processo, ou seja, devolve a média da vida inteira
// dele. Um processo que martelou a CPU no início e agora está parado
// continuaria aparecendo pesado pra sempre. Aqui a conta é entre esta
// amostra e a anterior, como já é feito pra disco e rede.
func (collector *Collector) readProcessInstances(procs []*process.Process, logicalCPUs int) []namedInstance {
	collector.mu.Lock()
	defer collector.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(collector.lastProcessAt).Seconds()

	previousSamples := collector.lastProcessCPU
	currentSamples := make(map[int32]processCPUSample, len(procs))

	instances := make([]namedInstance, 0, len(procs))
	for _, proc := range procs {
		instance, sample, readable := readOneProcess(proc, previousSamples, elapsed, logicalCPUs)
		if !readable {
			continue
		}
		currentSamples[proc.Pid] = sample
		instances = append(instances, instance)
	}

	// Trocar o mapa inteiro (em vez de atualizar) descarta sozinho os
	// processos que morreram desde a amostra anterior.
	collector.lastProcessCPU = currentSamples
	collector.lastProcessAt = now

	return instances
}

// readOneProcess lê um processo. O último retorno é falso quando não
// conseguimos inspecioná-lo (permissão negada, terminou durante a varredura)
// — esperado no Windows, não um erro do agente.
func readOneProcess(
	proc *process.Process,
	previousSamples map[int32]processCPUSample,
	elapsed float64,
	logicalCPUs int,
) (namedInstance, processCPUSample, bool) {
	name, err := proc.Name()
	if err != nil {
		return namedInstance{}, processCPUSample{}, false
	}
	times, err := proc.Times()
	if err != nil {
		return namedInstance{}, processCPUSample{}, false
	}
	createdAtMillis, err := proc.CreateTime()
	if err != nil {
		return namedInstance{}, processCPUSample{}, false
	}

	sample := processCPUSample{
		createdAtMillis: createdAtMillis,
		// User + System em vez de Total(): num processo os outros campos
		// (idle, iowait...) são sempre zero, e somar só os dois que
		// importam deixa claro o que está sendo medido.
		cpuSeconds: times.User + times.System,
	}

	memPercent, _ := proc.MemoryPercent()
	var memBytes uint64
	if memInfo, err := proc.MemoryInfo(); err == nil && memInfo != nil {
		memBytes = memInfo.RSS
	}

	return namedInstance{
		name: name,
		instance: ProcessInstance{
			PID:        proc.Pid,
			CPUPercent: processCPUSince(previousSamples, proc.Pid, sample, elapsed, logicalCPUs),
			MemPercent: memPercent,
			MemBytes:   memBytes,
		},
	}, sample, true
}

// processCPUSince calcula quanto o processo consumiu desde a amostra
// anterior. Sem amostra anterior — na primeira leitura depois que o agente
// sobe — ou com o PID reaproveitado por outro processo, devolve zero, igual
// às taxas de disco e rede.
func processCPUSince(
	previousSamples map[int32]processCPUSample,
	pid int32,
	sample processCPUSample,
	elapsed float64,
	logicalCPUs int,
) float64 {
	prior, seen := previousSamples[pid]
	if !seen || prior.createdAtMillis != sample.createdAtMillis {
		return 0
	}
	return processCPUPercent(prior.cpuSeconds, sample.cpuSeconds, elapsed, logicalCPUs)
}

// processCPUPercent converte dois contadores cumulativos em "quanto da
// máquina este processo usou no intervalo".
//
// A divisão pelo número de núcleos lógicos é o que faltava: os segundos de
// CPU somam todos os núcleos, então um processo ocupando dois núcleos o
// intervalo inteiro daria 200%. Dividindo, a coluna passa a significar a
// mesma coisa que o medidor de CPU no alto da tela — e que o Gerenciador de
// Tarefas.
func processCPUPercent(previousSeconds, currentSeconds, elapsedSeconds float64, logicalCPUs int) float64 {
	if elapsedSeconds <= 0 || logicalCPUs <= 0 {
		return 0
	}

	consumed := currentSeconds - previousSeconds
	// Contador que anda pra trás não existe num processo vivo; se acontecer
	// (PID reciclado que escapou da checagem), zero é mais honesto que um
	// número negativo.
	if consumed <= 0 {
		return 0
	}

	percent := 100 * consumed / (elapsedSeconds * float64(logicalCPUs))
	// Descompasso de alguns milissegundos entre a leitura do relógio e a do
	// contador pode estourar 100 por frações. A tela mostra "% da máquina";
	// acima disso não existe.
	if percent > 100 {
		return 100
	}
	return percent
}

// topProcessGroups junta os processos de mesmo executável num grupo só,
// somando CPU e memória, e devolve os `limit` grupos que mais consomem CPU.
//
// Dentro de cada grupo os processos ficam do mais pesado pro mais leve, que
// é a ordem útil quando a pessoa abre a linha pra investigar. A ordenação é
// estável nos dois níveis pra lista não dançar na tela entre uma amostra e
// outra quando dois grupos empatam.
func topProcessGroups(instances []namedInstance, limit int) []ProcessStats {
	if limit <= 0 {
		return nil
	}

	byName := make(map[string]*ProcessStats, len(instances))
	// A ordem de chegada serve de desempate estável: percorrer o mapa
	// direto daria uma ordem diferente a cada amostra.
	arrivalOrder := make([]string, 0, len(instances))

	for _, item := range instances {
		group, exists := byName[item.name]
		if !exists {
			group = &ProcessStats{Name: item.name}
			byName[item.name] = group
			arrivalOrder = append(arrivalOrder, item.name)
		}

		group.InstanceCount++
		group.CPUPercent += item.instance.CPUPercent
		group.MemPercent += item.instance.MemPercent
		group.MemBytes += item.instance.MemBytes
		group.Instances = append(group.Instances, item.instance)
	}

	groups := make([]ProcessStats, 0, len(arrivalOrder))
	for _, name := range arrivalOrder {
		group := byName[name]
		sort.SliceStable(group.Instances, func(firstIndex, secondIndex int) bool {
			return group.Instances[firstIndex].CPUPercent > group.Instances[secondIndex].CPUPercent
		})
		groups = append(groups, *group)
	}

	sort.SliceStable(groups, func(firstIndex, secondIndex int) bool {
		return groups[firstIndex].CPUPercent > groups[secondIndex].CPUPercent
	})
	if len(groups) > limit {
		groups = groups[:limit]
	}
	return groups
}
