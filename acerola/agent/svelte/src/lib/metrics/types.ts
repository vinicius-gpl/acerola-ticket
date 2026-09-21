// Espelha src-go/metrics/types.go — os nomes de campo em JSON (camelCase)
// vêm das tags `json:"..."` de lá. Se um campo mudar de um lado, muda do
// outro; não tem geração automática de tipos nesta fase.

export type Inventory = {
	hostname: string;
	os: string;
	platform: string;
	platformVersion: string;
	kernelVersion: string;
	arch: string;
	cpuModel: string;
	logicalCpus: number;
	physicalCpus: number;
	totalMemoryBytes: number;
	macAddress: string;
	localIp: string;
	totalDiskBytes: number;
	freeDiskBytes: number;
	uptimeSeconds: number;
	bootTime: string;
};

export type CPUStats = {
	percentTotal: number;
	percentPerCore: number[];
};

export type MemoryStats = {
	totalBytes: number;
	usedBytes: number;
	freeBytes: number;
	usedPercent: number;
	swapTotalBytes: number;
	swapUsedBytes: number;
	swapUsedPercent: number;
};

export type DiskStats = {
	mountpoint: string;
	fstype: string;
	totalBytes: number;
	usedBytes: number;
	freeBytes: number;
	usedPercent: number;
};

export type DiskIOStats = {
	readBytesPerSec: number;
	writeBytesPerSec: number;
};

export type NetInterfaceStats = {
	name: string;
	bytesSentPerSec: number;
	bytesRecvPerSec: number;
};

// Um processo individual dentro de um grupo — uma aba do Chrome, por
// exemplo. Espelha metrics.ProcessInstance no Go.
export type ProcessInstance = {
	pid: number;
	cpuPercent: number;
	memPercent: number;
	memBytes: number;
};

// Um aplicativo: todos os processos do mesmo executável somados. Espelha
// metrics.ProcessStats no Go — ver src-go/metrics/types.go para o porquê do
// agrupamento.
export type ProcessStats = {
	name: string;
	instanceCount: number;
	cpuPercent: number;
	memPercent: number;
	memBytes: number;
	instances: ProcessInstance[];
};

export type Snapshot = {
	timestamp: string;
	host: Inventory;
	cpu: CPUStats;
	memory: MemoryStats;
	disks: DiskStats[];
	diskIo: DiskIOStats;
	network: NetInterfaceStats[];
	processes: ProcessStats[];
};
