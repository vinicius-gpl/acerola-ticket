package assets

import "testing"

func TestTrayIconEmbeddedHappyPath(testingContext *testing.T) {
	// feliz: o arquivo tray.ico embutido deve ter conteúdo válido e não vazio
	iconByteCount := len(TrayICO)
	if iconByteCount == 0 {
		testingContext.Fatal("expected embedded TrayICO, got an empty slice")
	}

	// Cabeçalho padrão de formato ICO do Windows começa com 0x00 0x00 0x01 0x00
	minimumIconHeaderLength := 4
	if iconByteCount < minimumIconHeaderLength {
		testingContext.Fatalf("icon file smaller than minimum header: bytes=%d", iconByteCount)
	}

	if TrayICO[0] != 0x00 || TrayICO[1] != 0x00 || TrayICO[2] != 0x01 || TrayICO[3] != 0x00 {
		testingContext.Error("invalid ICO header signature in TrayICO")
	}
}
