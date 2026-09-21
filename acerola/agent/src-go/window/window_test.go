package window

import "testing"

func TestIsWindows11StableResult(testingContext *testing.T) {
	// feliz: a versão do sistema é lida sem erro e não muda entre chamadas (é calculada uma vez)
	first := isWindows11()
	second := isWindows11()

	if first != second {
		testingContext.Errorf("unstable result: first=%t, second=%t", first, second)
	}
}

func TestHandleWithoutWindow(testingContext *testing.T) {
	// triste: rodando nos testes não existe janela Wails, então o handle vem zerado em vez de inválido
	handle := Handle()

	if handle != 0 {
		testingContext.Errorf("handle = %v, want 0 outside the app", handle)
	}
}

func TestPlaceWithoutHandle(testingContext *testing.T) {
	// triste: posicionar sem handle não pode chamar a API do Windows nem derrubar o app
	Place(0, 100, 100, 380, 650)
}

func TestRoundCornersWithoutHandle(testingContext *testing.T) {
	// triste: arredondar sem handle não pode chamar a API do Windows nem derrubar o app
	RoundCorners(0, 380, 650, 8)
}
