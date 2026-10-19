package screen

import "testing"

func TestActiveAreaHappyPath(testingContext *testing.T) {
	// feliz: a área útil do monitor ativo vem com dimensões plausíveis e escala válida
	area := ActiveArea()

	if area.Width <= 0 || area.Height <= 0 {
		testingContext.Errorf("invalid work area size: width=%d, height=%d", area.Width, area.Height)
	}

	// Na maioria dos monitores a área útil tem pelo menos 640x480
	minimumWidthThreshold := 640
	minimumHeightThreshold := 480
	if area.Width < minimumWidthThreshold || area.Height < minimumHeightThreshold {
		testingContext.Errorf("work area smaller than minimum resolution: width=%d, height=%d", area.Width, area.Height)
	}

	if area.Scale <= 0 {
		testingContext.Errorf("monitor scale = %f, want a positive value", area.Scale)
	}
}

func TestAreaFromRectHappyPath(testingContext *testing.T) {
	// feliz: largura e altura saem da diferença entre as bordas, e a origem é preservada
	area := areaFromRect(rect{Left: 100, Top: 50, Right: 1920, Bottom: 1050}, 1.5)

	expectedWidth := 1820
	expectedHeight := 1000
	if area.Width != expectedWidth || area.Height != expectedHeight {
		testingContext.Errorf("size = (%d, %d), want (%d, %d)",
			area.Width, area.Height, expectedWidth, expectedHeight)
	}

	if area.X != 100 || area.Y != 50 {
		testingContext.Errorf("origin = (%d, %d), want (100, 50)", area.X, area.Y)
	}

	if area.Scale != 1.5 {
		testingContext.Errorf("scale = %f, want 1.5", area.Scale)
	}
}

func TestAreaFromRectSecondMonitor(testingContext *testing.T) {
	// feliz: um monitor à esquerda do principal tem origem negativa, e isso é preservado (caso limite)
	area := areaFromRect(rect{Left: -1920, Top: 0, Right: 0, Bottom: 1080}, 1)

	if area.X != -1920 {
		testingContext.Errorf("origin X = %d, want -1920", area.X)
	}

	expectedWidth := 1920
	if area.Width != expectedWidth {
		testingContext.Errorf("width = %d, want %d", area.Width, expectedWidth)
	}
}

func TestAreaOfMonitorWithoutMonitor(testingContext *testing.T) {
	// triste: sem monitor identificado, a consulta avisa que falhou em vez de devolver lixo
	area, found := areaOfMonitor(0)

	if found {
		testingContext.Error("found = true, want false for a missing monitor")
	}

	if area != (Area{}) {
		testingContext.Errorf("area = %+v, want zero value", area)
	}
}

func TestScaleOfMonitorWithoutMonitor(testingContext *testing.T) {
	// triste: sem monitor identificado, a escala cai em 100% em vez de zero (que quebraria o cálculo)
	scale := scaleOfMonitor(0)

	if scale != 1 {
		testingContext.Errorf("scale = %f, want 1", scale)
	}
}
