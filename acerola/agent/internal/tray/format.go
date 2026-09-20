package tray

import "fmt"

// humanizeBytes renders a byte count as a short human string (KB/MB/GB/TB),
// matching the granularity people actually read on a tray tooltip.
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

// humanizeUptime renders a duration in seconds as "3d 4h 12min", dropping
// units that are zero so short uptimes stay readable.
func humanizeUptime(totalSeconds uint64) string {
	days := totalSeconds / 86400
	hours := (totalSeconds % 86400) / 3600
	minutes := (totalSeconds % 3600) / 60

	switch {
	case days > 0:
		return fmt.Sprintf("%dd %dh %dmin", days, hours, minutes)
	case hours > 0:
		return fmt.Sprintf("%dh %dmin", hours, minutes)
	default:
		return fmt.Sprintf("%dmin", minutes)
	}
}
