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
		inv.PhysicalCPUs = int(cpuInfo[0].Cores)
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
	snap.Processes = collector.collectProcesses(processLimit)

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

// collectProcesses retorna os `limit` processos com maior uso de CPU.
// Processos que não conseguimos inspecionar (permissão negada, terminou
// durante a varredura) são ignorados silenciosamente — isso é esperado no
// Windows, não uma condição de erro.
func (collector *Collector) collectProcesses(limit int) []ProcessStats {
	if limit <= 0 {
		return nil
	}
	procs, err := process.Processes()
	if err != nil {
		return nil
	}

	stats := make([]ProcessStats, 0, len(procs))
	for _, proc := range procs {
		name, err := proc.Name()
		if err != nil {
			continue
		}
		cpuPct, err := proc.CPUPercent()
		if err != nil {
			continue
		}
		memPct, _ := proc.MemoryPercent()
		var memBytes uint64
		if memInfo, err := proc.MemoryInfo(); err == nil && memInfo != nil {
			memBytes = memInfo.RSS
		}
		stats = append(stats, ProcessStats{
			PID:        proc.Pid,
			Name:       name,
			CPUPercent: cpuPct,
			MemPercent: memPct,
			MemBytes:   memBytes,
		})
	}

	sort.Slice(stats, func(firstIndex, secondIndex int) bool {
		return stats[firstIndex].CPUPercent > stats[secondIndex].CPUPercent
	})
	if len(stats) > limit {
		stats = stats[:limit]
	}
	return stats
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
