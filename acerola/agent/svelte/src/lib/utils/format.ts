// Formatação de números pra leitura humana. Existia como humanizeBytes/
// humanizeUptime no Go (internal/tray) na versão anterior do agente; agora
// que a bandeja não desenha mais texto (isso é da popup), essa lógica mora
// só aqui.

export function bytes(byteCount: number): string {
	if (!byteCount || byteCount <= 0) return '0 B';
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let unitIndex = 0;
	let value = byteCount;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}
	return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function bytesPerSec(byteCount: number): string {
	return `${bytes(byteCount)}/s`;
}

export function uptime(totalSeconds: number): string {
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${minutes}min`;
	return `${minutes}min`;
}

export function percent(value: number): string {
	return `${value.toFixed(0)}%`;
}
