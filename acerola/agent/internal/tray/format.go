package tray

import "fmt"

// humanizeBytes formata uma quantidade de bytes num texto curto e legível
// (KB/MB/GB/TB), na granularidade que dá pra ler numa dica da bandeja.
func humanizeBytes(b uint64) string {
	const unit = 1024
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := uint64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	units := []string{"KB", "MB", "GB", "TB", "PB"}
	return fmt.Sprintf("%.1f %s", float64(b)/float64(div), units[exp])
}

// humanizeUptime formata uma duração em segundos como "3d 4h 12min",
// omitindo as unidades zeradas pra manter o texto curto e legível.
func humanizeUptime(totalSeconds uint64) string {
	days := totalSeconds / 86400
	hours := (totalSeconds % 86400) / 3600
	minutes := (totalSeconds % 3600) / 60

	if days > 0 {
		return fmt.Sprintf("%dd %dh %dmin", days, hours, minutes)
	}

	if hours > 0 {
		return fmt.Sprintf("%dh %dmin", hours, minutes)
	}

	return fmt.Sprintf("%dmin", minutes)
}
