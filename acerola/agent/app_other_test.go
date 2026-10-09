//go:build !windows

package main

import (
	"testing"

	"github.com/wailsapp/wails/v2/pkg/runtime"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/screen"
)

func TestAreaOfCurrentScreenHappyPath(testingContext *testing.T) {
	// feliz: com duas telas, vale a que está marcada como atual
	screens := []runtime.Screen{screenOfSize(1920, 1080), screenOfSize(2560, 1440)}
	screens[1].IsCurrent = true

	expected := screen.Area{Width: 2560, Height: 1440, Scale: 1}
	if area := areaOfCurrentScreen(screens); area != expected {
		testingContext.Errorf("area = %+v, want %+v", area, expected)
	}
}

func TestAreaOfCurrentScreenWithoutScreens(testingContext *testing.T) {
	// triste: sem tela nenhuma informada, cai num tamanho plausível em vez de zero
	expected := screen.Area{Width: fallbackScreenWidth, Height: fallbackScreenHeight, Scale: 1}
	if area := areaOfCurrentScreen(nil); area != expected {
		testingContext.Errorf("area = %+v, want %+v", area, expected)
	}
}

// screenOfSize monta a tela campo a campo: o tipo do tamanho mora num pacote
// interno do Wails e não pode ser escrito por extenso aqui.
func screenOfSize(width, height int) runtime.Screen {
	var result runtime.Screen
	result.Size.Width = width
	result.Size.Height = height

	return result
}
