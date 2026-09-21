package metrics

import (
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/host"
	"github.com/shirou/gopsutil/v4/mem"
	gonet "github.com/shirou/gopsutil/v4/net"
	"github.com/shirou/gopsutil/v4/process"
)

// Collector guarda o pouco de estado necessário pra transformar os
// contadores cumulativos do gopsutil (bytes de disco/rede) em taxas por
// segundo: a leitura anterior e quando ela foi tirada.
type Collector struct {
	mu sync.Mutex

	lastSampleAt time.Time
	lastDiskIO   map[string]disk.IOCountersStat
	lastNetIO    map[string]gonet.IOCountersStat

	// CPU por processo tem o mesmo problema dos bytes de disco/rede: o
	// sistema só oferece um contador cumulativo (segundos de CPU desde que
	// o processo nasceu). Guardamos a leitura anterior de cada PID pra
	// calcular quanto ele gastou *neste* intervalo.
	lastProcessCPU map[int32]processCPUSample
	lastProcessAt  time.Time
}

// processCPUSample é a leitura anterior de um processo. O instante de
// criação entra junto porque o Windows reaproveita PID: sem ele, um
// processo novo que herdou o número de um morto apareceria com um pico
// absurdo de CPU na primeira amostra.
type processCPUSample struct {
	createdAtMillis int64
	cpuSeconds      float64
}

func New() *Collector {
	return &Collector{}
}

// Inventory lê os fatos majoritariamente estáticos e relevantes para
// provisionamento desta máquina. É barato o suficiente pra chamar a cada
// atualização da bandeja.
func (collector *Collector) Inventory() (Inventory, error) {
	inv := Inventory{}

	hostInfo, err := host.Info()
	if err != nil {
		return inv, err
	}
	inv.Hostname = hostInfo.Hostname
	inv.OS = hostInfo.OS
	inv.Platform = hostInfo.Platform
	inv.PlatformVersion = hostInfo.PlatformVersion
	inv.KernelVersion = hostInfo.KernelVersion
	inv.UptimeSeconds = hostInfo.Uptime
	inv.BootTime = time.Unix(int64(hostInfo.BootTime), 0)
	inv.Arch = hostInfo.KernelArch

	cpuInfo, err := cpu.Info()
	if err == nil && len(cpuInfo) > 0 {
		inv.CPUModel = strings.TrimSpace(cpuInfo[0].ModelName)
	}

	// O campo `Cores` de cpu.Info() mente no Windows: o gopsutil preenche
	// ele com a contagem *lógica* (ver cpu_windows.go, `Cores:
	// int32(logicalCount)`), então num processador de 6 núcleos com
	// hyperthreading o inventário mostrava 12 físicos e 12 lógicos. Quem
	// sabe separar os dois é cpu.Counts.
	physical, err := cpu.Counts(false)
	if err == nil {
		inv.PhysicalCPUs = physical
	}
	logical, err := cpu.Counts(true)
	if err == nil {
		inv.LogicalCPUs = logical
	}

	vmem, err := mem.VirtualMemory()
	if err == nil {
		inv.TotalMemoryBytes = vmem.Total
	}

	mac, ip := primaryInterface()
	inv.MACAddress = mac
	inv.LocalIP = ip

	total, free := physicalDiskTotals()
	inv.TotalDiskBytes = total
	inv.FreeDiskBytes = free

	return inv, nil
}

// Snapshot lê as métricas ao vivo completas usadas pelo painel web,
// incluindo os processLimit processos com maior uso de CPU.
func (collector *Collector) Snapshot(processLimit int) (Snapshot, error) {
	snap := Snapshot{Timestamp: time.Now()}

	inv, err := collector.Inventory()
	if err != nil {
		return snap, err
	}
	snap.Host = inv

	if err := collector.collectCPU(&snap); err != nil {
		return snap, err
	}
	if err := collector.collectMemory(&snap); err != nil {
		return snap, err
	}
	collector.collectDisks(&snap)
	collector.collectRates(&snap)
	snap.Processes = collector.collectProcesses(processLimit, snap.Host.LogicalCPUs)

	return snap, nil
}

func (collector *Collector) collectCPU(snap *Snapshot) error {
	total, err := cpu.Percent(0, false)
	if err != nil {
		return err
	}
	perCore, err := cpu.Percent(0, true)
	if err != nil {
		return err
	}
	if len(total) > 0 {
		snap.CPU.PercentTotal = total[0]
	}
	snap.CPU.PercentPerCore = perCore
	return nil
}

func (collector *Collector) collectMemory(snap *Snapshot) error {
	vmem, err := mem.VirtualMemory()
	if err != nil {
		return err
	}
	snap.Memory.TotalBytes = vmem.Total
	snap.Memory.UsedBytes = vmem.Used
	snap.Memory.FreeBytes = vmem.Free
	snap.Memory.UsedPercent = vmem.UsedPercent

	swap, err := mem.SwapMemory()
	if err == nil {
		snap.Memory.SwapTotalBytes = swap.Total
		snap.Memory.SwapUsedBytes = swap.Used
		snap.Memory.SwapUsedPercent = swap.UsedPercent
	}
	return nil
}

func (collector *Collector) collectDisks(snap *Snapshot) {
	partitions, err := disk.Partitions(false)
	if err != nil {
		return
	}
	seen := map[string]bool{}
	for _, partition := range partitions {
		if seen[partition.Mountpoint] {
			continue
		}
		seen[partition.Mountpoint] = true
		usage, err := disk.Usage(partition.Mountpoint)
		if err != nil || usage.Total == 0 {
			continue
		}
		snap.Disks = append(snap.Disks, DiskStats{
			Mountpoint:  partition.Mountpoint,
			Fstype:      partition.Fstype,
			TotalBytes:  usage.Total,
			UsedBytes:   usage.Used,
			FreeBytes:   usage.Free,
			UsedPercent: usage.UsedPercent,
		})
	}
}

// collectRates transforma os contadores cumulativos de disco/rede que o
// gopsutil expõe em bytes/segundo, comparando com a chamada anterior. A
// primeira chamada depois do agente iniciar não tem uma base de comparação,
// então relata taxa zero.
func (collector *Collector) collectRates(snap *Snapshot) {
	collector.mu.Lock()
	defer collector.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(collector.lastSampleAt).Seconds()
	hasBaseline := !collector.lastSampleAt.IsZero() && elapsed > 0

	collector.collectDiskRate(snap, elapsed, hasBaseline)
	collector.collectNetRate(snap, elapsed, hasBaseline)

	collector.lastSampleAt = now
}

func (collector *Collector) collectDiskRate(snap *Snapshot, elapsed float64, hasBaseline bool) {
	diskIO, err := disk.IOCounters()
	if err != nil {
		return
	}

	var readTotal, writeTotal uint64
	for _, counters := range diskIO {
		readTotal += counters.ReadBytes
		writeTotal += counters.WriteBytes
	}
	if hasBaseline {
		var prevRead, prevWrite uint64
		for _, counters := range collector.lastDiskIO {
			prevRead += counters.ReadBytes
			prevWrite += counters.WriteBytes
		}
		snap.DiskIO.ReadBytesPerSec = rate(prevRead, readTotal, elapsed)
		snap.DiskIO.WriteBytesPerSec = rate(prevWrite, writeTotal, elapsed)
	}
	collector.lastDiskIO = diskIO
}

func (collector *Collector) collectNetRate(snap *Snapshot, elapsed float64, hasBaseline bool) {
	netIO, err := gonet.IOCounters(true)
	if err != nil {
		return
	}

	activeNames := activeInterfaceNames()
	for _, counters := range netIO {
		if !activeNames[counters.Name] {
			continue
		}
		stat := NetInterfaceStats{Name: counters.Name}
		if prev, ok := collector.lastNetIO[counters.Name]; hasBaseline && ok {
			stat.BytesSentPerSec = rate(prev.BytesSent, counters.BytesSent, elapsed)
			stat.BytesRecvPerSec = rate(prev.BytesRecv, counters.BytesRecv, elapsed)
		}
		snap.Network = append(snap.Network, stat)
	}

	byName := make(map[string]gonet.IOCountersStat, len(netIO))
	for _, counters := range netIO {
		byName[counters.Name] = counters
	}
	collector.lastNetIO = byName
}

func rate(prev, current uint64, elapsedSeconds float64) float64 {
	if current < prev || elapsedSeconds <= 0 {
		return 0
	}
	return float64(current-prev) / elapsedSeconds
}

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

// activeInterfaceNames lista as interfaces de rede que estão ativas e não
// são loopback, para que os painéis de throughput e a detecção de MAC/IP
// ignorem adaptadores virtuais e inativos.
func activeInterfaceNames() map[string]bool {
	names := map[string]bool{}
	ifaces, err := gonet.Interfaces()
	if err != nil {
		return names
	}
	for _, iface := range ifaces {
		if !hasFlag(iface.Flags, "up") || hasFlag(iface.Flags, "loopback") {
			continue
		}
		names[iface.Name] = true
	}
	return names
}

// primaryInterface escolhe a primeira interface ativa e não-loopback que tem
// MAC e IPv4 — a que importa pra provisionamento ("qual cabo/Wi-Fi essa
// máquina está realmente usando").
func primaryInterface() (mac string, ip string) {
	ifaces, err := gonet.Interfaces()
	if err != nil {
		return "", ""
	}
	for _, iface := range ifaces {
		if !hasFlag(iface.Flags, "up") || hasFlag(iface.Flags, "loopback") {
			continue
		}
		if iface.HardwareAddr == "" {
			continue
		}
		for _, addr := range iface.Addrs {
			candidate := strings.SplitN(addr.Addr, "/", 2)[0]
			if strings.Contains(candidate, ":") {
				continue // ignora IPv6 — o campo de inventário é simples, só IPv4
			}
			return iface.HardwareAddr, candidate
		}
	}
	return "", ""
}

func hasFlag(flags []string, want string) bool {
	for _, flag := range flags {
		if strings.EqualFold(flag, want) {
			return true
		}
	}
	return false
}

// physicalDiskTotals soma bytes totais/livres entre as partições físicas
// locais distintas, para o número de "disco total/livre" da bandeja.
func physicalDiskTotals() (total uint64, free uint64) {
	partitions, err := disk.Partitions(false)
	if err != nil {
		return 0, 0
	}
	seen := map[string]bool{}
	for _, partition := range partitions {
		if seen[partition.Mountpoint] {
			continue
		}
		seen[partition.Mountpoint] = true
		usage, err := disk.Usage(partition.Mountpoint)
		if err != nil {
			continue
		}
		total += usage.Total
		free += usage.Free
	}
	return total, free
}
