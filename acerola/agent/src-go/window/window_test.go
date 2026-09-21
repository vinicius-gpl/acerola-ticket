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

func TestHandleLooksUpTheAgentClass(testingContext *testing.T) {
	// feliz: Handle procura exatamente a classe registrada em main.go — o resultado varia conforme o agente esteja aberto ou não
	if Handle() != handleOfClass(ClassName) {
		testingContext.Error("Handle() must look up ClassName")
	}
}

func TestHandleOfUnknownClass(testingContext *testing.T) {
	// triste: classe que não existe devolve handle zerado em vez de lixo
	handle := handleOfClass("AcerolaClassThatDoesNotExist")

	if handle != 0 {
		testingContext.Errorf("handle = %v, want 0 for an unknown class", handle)
	}
}

func TestHandleOfInvalidClassName(testingContext *testing.T) {
	// triste: nome com byte nulo não converte pra UTF-16 e devolve zero sem chamar o Windows (caso limite)
	handle := handleOfClass("Acerola" + string(rune(0)) + "Agent")

	if handle != 0 {
		testingContext.Errorf("handle = %v, want 0 for an unconvertible class name", handle)
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
