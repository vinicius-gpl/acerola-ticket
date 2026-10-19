//go:build !windows

package assets

import (
	"bytes"
	"image/png"
	"testing"
)

func TestTrayPNGEmbeddedHappyPath(testingContext *testing.T) {
	// feliz: o tray.png embutido é um PNG de verdade, quadrado
	icon, decodeError := png.Decode(bytes.NewReader(TrayPNG))
	if decodeError != nil {
		testingContext.Fatalf("TrayPNG is not a valid PNG: %v", decodeError)
	}

	if icon.Bounds().Dx() != icon.Bounds().Dy() {
		testingContext.Errorf("tray icon is not square: %v", icon.Bounds())
	}
}

func TestTrayPNGIsNotTheWindowsIcon(testingContext *testing.T) {
	// triste: o .ico do Windows não pode ser confundido com o PNG — a bandeja não saberia ler
	if _, decodeError := png.Decode(bytes.NewReader(TrayICO)); decodeError == nil {
		testingContext.Error("TrayICO decoded as PNG, want an error")
	}
}
