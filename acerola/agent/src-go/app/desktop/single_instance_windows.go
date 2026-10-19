//go:build windows

package desktop

import (
	"os"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/lib/desktop/window"
)

func handleSingleInstance(background bool) {
	if handle := window.Handle(); handle != 0 {
		if !background {
			window.Activate(handle)
		}
		os.Exit(0)
	}
}
