//go:build windows

package main

import (
	"os"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/window"
)

func handleSingleInstance(background bool) {
	if handle := window.Handle(); handle != 0 {
		if !background {
			window.Activate(handle)
		}
		os.Exit(0)
	}
}
