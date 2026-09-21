package assets

import "testing"

func TestTrayIconEmbeddedHappyPath(testingContext *testing.T) {
	// feliz: o arquivo tray.ico embutido deve ter conteúdo válido e não vazio
	iconByteCount := len(TrayICO)
	if iconByteCount == 0 {
		testingContext.Fatal("esperava que TrayICO estivesse embutido, mas o slice está vazio")
	}

	// Cabeçalho padrão de formato ICO do Windows começa com 0x00 0x00 0x01 0x00
	minimumIconHeaderLength := 4
	if iconByteCount < minimumIconHeaderLength {
		testingContext.Fatalf("arquivo de ícone menor que o cabeçalho mínimo: bytes=%d", iconByteCount)
	}

	if TrayICO[0] != 0x00 || TrayICO[1] != 0x00 || TrayICO[2] != 0x01 || TrayICO[3] != 0x00 {
		testingContext.Error("assinatura do cabeçalho ICO inválida nos primeiros bytes de TrayICO")
	}
}
