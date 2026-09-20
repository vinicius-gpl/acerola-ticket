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

export type ProcessStats = {
	pid: number;
	name: string;
	cpuPercent: number;
	memPercent: number;
	memBytes: number;
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
