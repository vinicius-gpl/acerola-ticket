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

// Collector keeps the small amount of state needed to turn gopsutil's
// cumulative counters (disk/network bytes) into per-second rates: the
// previous reading and when it was taken.
type Collector struct {
	mu sync.Mutex

	lastSampleAt time.Time
	lastDiskIO   map[string]disk.IOCountersStat
	lastNetIO    map[string]gonet.IOCountersStat
}

func New() *Collector {
	return &Collector{}
}

// Inventory reads the mostly-static, provisioning-relevant facts about this
// machine. It is cheap enough to call on every tray refresh.
func (c *Collector) Inventory() (Inventory, error) {
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

// Snapshot reads the full live metrics used by the web dashboard, including
// the top processLimit processes by CPU usage.
func (c *Collector) Snapshot(processLimit int) (Snapshot, error) {
	snap := Snapshot{Timestamp: time.Now()}

	inv, err := c.Inventory()
	if err != nil {
		return snap, err
	}
	snap.Host = inv

	if err := c.collectCPU(&snap); err != nil {
		return snap, err
	}
	if err := c.collectMemory(&snap); err != nil {
		return snap, err
	}
	c.collectDisks(&snap)
	c.collectRates(&snap)
	snap.Processes = c.collectProcesses(processLimit)

	return snap, nil
}

func (c *Collector) collectCPU(snap *Snapshot) error {
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

func (c *Collector) collectMemory(snap *Snapshot) error {
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

func (c *Collector) collectDisks(snap *Snapshot) {
	partitions, err := disk.Partitions(false)
	if err != nil {
		return
	}
	seen := map[string]bool{}
	for _, p := range partitions {
		if seen[p.Mountpoint] {
			continue
		}
		seen[p.Mountpoint] = true
		usage, err := disk.Usage(p.Mountpoint)
		if err != nil || usage.Total == 0 {
			continue
		}
		snap.Disks = append(snap.Disks, DiskStats{
			Mountpoint:  p.Mountpoint,
			Fstype:      p.Fstype,
			TotalBytes:  usage.Total,
			UsedBytes:   usage.Used,
			FreeBytes:   usage.Free,
			UsedPercent: usage.UsedPercent,
		})
	}
}

// collectRates turns the cumulative disk/network counters gopsutil exposes
// into bytes/second by comparing against the previous call. The first call
// after startup has no baseline, so it reports zero rates.
func (c *Collector) collectRates(snap *Snapshot) {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	elapsed := now.Sub(c.lastSampleAt).Seconds()
	hasBaseline := !c.lastSampleAt.IsZero() && elapsed > 0

	diskIO, err := disk.IOCounters()
	if err == nil {
		var readTotal, writeTotal uint64
		for _, io := range diskIO {
			readTotal += io.ReadBytes
			writeTotal += io.WriteBytes
		}
		if hasBaseline {
			var prevRead, prevWrite uint64
			for _, io := range c.lastDiskIO {
				prevRead += io.ReadBytes
				prevWrite += io.WriteBytes
			}
			snap.DiskIO.ReadBytesPerSec = rate(prevRead, readTotal, elapsed)
			snap.DiskIO.WriteBytesPerSec = rate(prevWrite, writeTotal, elapsed)
		}
		c.lastDiskIO = diskIO
	}

	activeNames := activeInterfaceNames()
	netIO, err := gonet.IOCounters(true)
	if err == nil {
		for _, io := range netIO {
			if !activeNames[io.Name] {
				continue
			}
			stat := NetInterfaceStats{Name: io.Name}
			if hasBaseline {
				if prev, ok := c.lastNetIO[io.Name]; ok {
					stat.BytesSentPerSec = rate(prev.BytesSent, io.BytesSent, elapsed)
					stat.BytesRecvPerSec = rate(prev.BytesRecv, io.BytesRecv, elapsed)
				}
			}
			snap.Network = append(snap.Network, stat)
		}
		byName := make(map[string]gonet.IOCountersStat, len(netIO))
		for _, io := range netIO {
			byName[io.Name] = io
		}
		c.lastNetIO = byName
	}

	c.lastSampleAt = now
}

func rate(prev, current uint64, elapsedSeconds float64) float64 {
	if current < prev || elapsedSeconds <= 0 {
		return 0
	}
	return float64(current-prev) / elapsedSeconds
}

// collectProcesses returns the top `limit` processes by CPU usage. Processes
// we can't inspect (permission denied, exited mid-scan) are silently
// skipped — that is expected and not an error condition on Windows.
func (c *Collector) collectProcesses(limit int) []ProcessStats {
	if limit <= 0 {
		return nil
	}
	procs, err := process.Processes()
	if err != nil {
		return nil
	}

	stats := make([]ProcessStats, 0, len(procs))
	for _, p := range procs {
		name, err := p.Name()
		if err != nil {
			continue
		}
		cpuPct, err := p.CPUPercent()
		if err != nil {
			continue
		}
		memPct, _ := p.MemoryPercent()
		var memBytes uint64
		if memInfo, err := p.MemoryInfo(); err == nil && memInfo != nil {
			memBytes = memInfo.RSS
		}
		stats = append(stats, ProcessStats{
			PID:        p.Pid,
			Name:       name,
			CPUPercent: cpuPct,
			MemPercent: memPct,
			MemBytes:   memBytes,
		})
	}

	sort.Slice(stats, func(i, j int) bool {
		return stats[i].CPUPercent > stats[j].CPUPercent
	})
	if len(stats) > limit {
		stats = stats[:limit]
	}
	return stats
}

// activeInterfaceNames lists network interfaces that are up and not
// loopback, so disk/network throughput panels and MAC/IP detection ignore
// virtual and inactive adapters.
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

// primaryInterface picks the first active, non-loopback interface that has
// both a MAC address and an IPv4 address — the one relevant for
// provisioning ("which cable/Wi-Fi is this machine actually using").
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
				continue // ignore IPv6 for the simple inventory field
			}
			return iface.HardwareAddr, candidate
		}
	}
	return "", ""
}

func hasFlag(flags []string, want string) bool {
	for _, f := range flags {
		if strings.EqualFold(f, want) {
			return true
		}
	}
	return false
}

// physicalDiskTotals sums total/free bytes across distinct local physical
// partitions, for the tray's "disco total/livre" figure.
func physicalDiskTotals() (total uint64, free uint64) {
	partitions, err := disk.Partitions(false)
	if err != nil {
		return 0, 0
	}
	seen := map[string]bool{}
	for _, p := range partitions {
		if seen[p.Mountpoint] {
			continue
		}
		seen[p.Mountpoint] = true
		usage, err := disk.Usage(p.Mountpoint)
		if err != nil {
			continue
		}
		total += usage.Total
		free += usage.Free
	}
	return total, free
}
