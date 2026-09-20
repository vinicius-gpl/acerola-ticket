package tray

import (
	"testing"
)

func TestCallbacksInvocationHappyPath(testingContext *testing.T) {
	// feliz: garante que os callbacks encapsulados são invocáveis sem erro
	popupCalled := false
	dashboardCalled := false
	quitCalled := false

	callbacksStructure := Callbacks{
		ShowPopup:     func() { popupCalled = true },
		ShowDashboard: func() { dashboardCalled = true },
		Quit:          func() { quitCalled = true },
	}

	callbacksStructure.ShowPopup()
	callbacksStructure.ShowDashboard()
	callbacksStructure.Quit()

	if !popupCalled {
		testingContext.Error("ShowPopup deveria ter sido executado")
	}
	if !dashboardCalled {
		testingContext.Error("ShowDashboard deveria ter sido executado")
	}
	if !quitCalled {
		testingContext.Error("Quit deveria ter sido executado")
	}
}
