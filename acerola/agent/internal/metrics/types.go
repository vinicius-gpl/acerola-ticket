// Package metrics collects local system metrics via gopsutil and normalizes
// them into the structs consumed by both the tray menu and the web
// dashboard. See docs/METRICAS.md for what each field means and why it was
// chosen.
package metrics

import "time"

// Inventory holds data that is useful for provisioning/inventory decisions:
// it changes rarely (never, during a single run, except Uptime/FreeDisk) and
// answers "what machine is this and how is it equipped", not "how busy is it
// right now". This is what the tray menu shows.
type Inventory struct {
	Hostname         string    `json:"hostname"`
	OS               string    `json:"os"`       // ex: "windows"
	Platform         string    `json:"platform"` // ex: "Microsoft Windows 11 Pro"
	PlatformVersion  string    `json:"platformVersion"`
	KernelVersion    string    `json:"kernelVersion"`
	Arch             string    `json:"arch"` // ex: "amd64"
	CPUModel         string    `json:"cpuModel"`
	LogicalCPUs      int       `json:"logicalCpus"`
	PhysicalCPUs     int       `json:"physicalCpus"`
	TotalMemoryBytes uint64    `json:"totalMemoryBytes"`
	MACAddress       string    `json:"macAddress"`
	LocalIP          string    `json:"localIp"`
	TotalDiskBytes   uint64    `json:"totalDiskBytes"`
	FreeDiskBytes    uint64    `json:"freeDiskBytes"`
	UptimeSeconds    uint64    `json:"uptimeSeconds"`
	BootTime         time.Time `json:"bootTime"`
}

// CPUStats is the live CPU load, sampled since the previous collection.
type CPUStats struct {
	PercentTotal   float64   `json:"percentTotal"`
	PercentPerCore []float64 `json:"percentPerCore"`
}

// MemoryStats is live RAM/swap usage.
type MemoryStats struct {
	TotalBytes      uint64  `json:"totalBytes"`
	UsedBytes       uint64  `json:"usedBytes"`
	FreeBytes       uint64  `json:"freeBytes"`
	UsedPercent     float64 `json:"usedPercent"`
	SwapTotalBytes  uint64  `json:"swapTotalBytes"`
	SwapUsedBytes   uint64  `json:"swapUsedBytes"`
	SwapUsedPercent float64 `json:"swapUsedPercent"`
}

// DiskStats is usage of a single mounted volume.
type DiskStats struct {
	Mountpoint  string  `json:"mountpoint"`
	Fstype      string  `json:"fstype"`
	TotalBytes  uint64  `json:"totalBytes"`
	UsedBytes   uint64  `json:"usedBytes"`
	FreeBytes   uint64  `json:"freeBytes"`
	UsedPercent float64 `json:"usedPercent"`
}

// DiskIOStats is the aggregated disk throughput since the previous
// collection (bytes/second across all physical disks).
type DiskIOStats struct {
	ReadBytesPerSec  float64 `json:"readBytesPerSec"`
	WriteBytesPerSec float64 `json:"writeBytesPerSec"`
}

// NetInterfaceStats is the throughput of one network interface since the
// previous collection.
type NetInterfaceStats struct {
	Name            string  `json:"name"`
	BytesSentPerSec float64 `json:"bytesSentPerSec"`
	BytesRecvPerSec float64 `json:"bytesRecvPerSec"`
}

// ProcessStats describes one running process for the "top processes" panel.
type ProcessStats struct {
	PID        int32   `json:"pid"`
	Name       string  `json:"name"`
	CPUPercent float64 `json:"cpuPercent"`
	MemPercent float32 `json:"memPercent"`
	MemBytes   uint64  `json:"memBytes"`
}

// Snapshot is the full point-in-time reading pushed to the web dashboard.
// The tray only ever needs Inventory, not a full Snapshot.
type Snapshot struct {
	Timestamp time.Time           `json:"timestamp"`
	Host      Inventory           `json:"host"`
	CPU       CPUStats            `json:"cpu"`
	Memory    MemoryStats         `json:"memory"`
	Disks     []DiskStats         `json:"disks"`
	DiskIO    DiskIOStats         `json:"diskIo"`
	Network   []NetInterfaceStats `json:"network"`
	Processes []ProcessStats      `json:"processes"`
}
