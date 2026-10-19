package metrics

import (
	"time"

	"github.com/shirou/gopsutil/v4/disk"
	gonet "github.com/shirou/gopsutil/v4/net"
)

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
