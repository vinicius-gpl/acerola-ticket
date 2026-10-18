package metrics

import (
	"sync"
	"time"

	"github.com/shirou/gopsutil/v4/cpu"
	"github.com/shirou/gopsutil/v4/disk"
	"github.com/shirou/gopsutil/v4/mem"
	gonet "github.com/shirou/gopsutil/v4/net"
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
