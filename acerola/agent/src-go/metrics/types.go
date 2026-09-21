// Package metrics coleta métricas locais de sistema via gopsutil e as
// normaliza nas structs consumidas tanto pelo menu da bandeja quanto pelo
// painel web. Veja docs/METRICAS.md para o significado de cada campo e por
// que ele foi escolhido.
package metrics

import "time"

// Inventory guarda dados úteis para decisões de provisionamento/inventário:
// muda raramente (nunca, durante uma execução, exceto Uptime/FreeDisk) e
// responde "que máquina é essa e como ela está equipada", não "o quanto ela
// está ocupada agora". É o que o menu da bandeja mostra.
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

// CPUStats é a carga de CPU ao vivo, amostrada desde a coleta anterior.
type CPUStats struct {
	PercentTotal   float64   `json:"percentTotal"`
	PercentPerCore []float64 `json:"percentPerCore"`
}

// MemoryStats é o uso ao vivo de RAM/swap.
type MemoryStats struct {
	TotalBytes      uint64  `json:"totalBytes"`
	UsedBytes       uint64  `json:"usedBytes"`
	FreeBytes       uint64  `json:"freeBytes"`
	UsedPercent     float64 `json:"usedPercent"`
	SwapTotalBytes  uint64  `json:"swapTotalBytes"`
	SwapUsedBytes   uint64  `json:"swapUsedBytes"`
	SwapUsedPercent float64 `json:"swapUsedPercent"`
}

// DiskStats é o uso de um único volume montado.
type DiskStats struct {
	Mountpoint  string  `json:"mountpoint"`
	Fstype      string  `json:"fstype"`
	TotalBytes  uint64  `json:"totalBytes"`
	UsedBytes   uint64  `json:"usedBytes"`
	FreeBytes   uint64  `json:"freeBytes"`
	UsedPercent float64 `json:"usedPercent"`
}

// DiskIOStats é o throughput agregado de disco desde a coleta anterior
// (bytes/segundo somando todos os discos físicos).
type DiskIOStats struct {
	ReadBytesPerSec  float64 `json:"readBytesPerSec"`
	WriteBytesPerSec float64 `json:"writeBytesPerSec"`
}

// NetInterfaceStats é o throughput de uma interface de rede desde a coleta
// anterior.
type NetInterfaceStats struct {
	Name            string  `json:"name"`
	BytesSentPerSec float64 `json:"bytesSentPerSec"`
	BytesRecvPerSec float64 `json:"bytesRecvPerSec"`
}

// ProcessInstance é um processo individual dentro de um grupo — uma aba do
// Chrome, por exemplo. Só aparece quando a pessoa abre a linha do grupo.
type ProcessInstance struct {
	PID        int32   `json:"pid"`
	CPUPercent float64 `json:"cpuPercent"`
	MemPercent float32 `json:"memPercent"`
	MemBytes   uint64  `json:"memBytes"`
}

// ProcessStats descreve um aplicativo no painel de "top processos": todos os
// processos do mesmo executável somados num grupo só.
//
// Sem esse agrupamento o painel mente. O Chrome abre dezenas de processos
// (um por aba, extensão, GPU) e olhar um de cada vez dá a impressão de que
// ele usa 400 MB quando o total é 2,6 GB. É o mesmo agrupamento que o
// Gerenciador de Tarefas do Windows faz.
type ProcessStats struct {
	Name          string            `json:"name"`
	InstanceCount int               `json:"instanceCount"`
	CPUPercent    float64           `json:"cpuPercent"`
	MemPercent    float32           `json:"memPercent"`
	MemBytes      uint64            `json:"memBytes"`
	Instances     []ProcessInstance `json:"instances"`
}

// Snapshot é a leitura completa num instante, enviada ao painel web. A
// bandeja só precisa de Inventory, nunca de um Snapshot inteiro.
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
