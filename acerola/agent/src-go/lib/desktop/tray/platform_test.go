package tray

import "testing"

func TestIconHappyPath(testingContext *testing.T) {
	// feliz: todo sistema tem um ícone de bandeja embutido
	if len(icon()) == 0 {
		testingContext.Fatal("icon() is empty, want the embedded tray icon")
	}
}

func TestAllowForegroundWithoutWindow(testingContext *testing.T) {
	// triste: sem janela nenhuma aberta, a chamada não pode derrubar o processo
	allowForeground()
}
