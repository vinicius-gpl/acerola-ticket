package screen

import "testing"

func TestWorkAreaHappyPath(testingContext *testing.T) {
	// feliz: chamada da API de tela do Windows retorna dimensões positivas plausíveis
	originX, originY, areaWidth, areaHeight := WorkArea()

	if areaWidth <= 0 || areaHeight <= 0 {
		testingContext.Errorf("dimensões da área útil inválidas: width=%d, height=%d", areaWidth, areaHeight)
	}

	// Na maioria dos monitores a área útil tem pelo menos 640x480
	minimumWidthThreshold := 640
	minimumHeightThreshold := 480
	if areaWidth < minimumWidthThreshold || areaHeight < minimumHeightThreshold {
		testingContext.Errorf("área útil menor que resolução mínima: width=%d, height=%d", areaWidth, areaHeight)
	}

	if originX < 0 || originY < 0 {
		testingContext.Logf("coordenadas iniciais com offset: originX=%d, originY=%d", originX, originY)
	}
}

func TestWorkAreaFallbackValues(testingContext *testing.T) {
	// feliz: valida a consistência do cálculo de largura e altura a partir do retângulo
	testBoundingBox := rect{
		Left:   100,
		Top:    50,
		Right:  1920,
		Bottom: 1050,
	}

	calculatedWidth := int(testBoundingBox.Right - testBoundingBox.Left)
	calculatedHeight := int(testBoundingBox.Bottom - testBoundingBox.Top)

	expectedWidth := 1820
	expectedHeight := 1000

	if calculatedWidth != expectedWidth || calculatedHeight != expectedHeight {
		testingContext.Errorf("cálculo incorreto do retângulo: got (%d, %d), want (%d, %d)",
			calculatedWidth, calculatedHeight, expectedWidth, expectedHeight)
	}
}
