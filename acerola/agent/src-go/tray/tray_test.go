package tray

import (
	"testing"
	"time"

	"fyne.io/systray"
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

// newMenuItems monta as entradas do menu sem bandeja nenhuma: só os canais de
// clique, que é o que watchMenu consome.
func newMenuItems() menuItems {
	return menuItems{
		popup:     &systray.MenuItem{ClickedCh: make(chan struct{}, 1)},
		dashboard: &systray.MenuItem{ClickedCh: make(chan struct{}, 1)},
		quit:      &systray.MenuItem{ClickedCh: make(chan struct{}, 1)},
	}
}

func TestWatchMenuRoutesEachItemToItsAction(testingContext *testing.T) {
	// feliz: cada entrada do menu chama a ação dela, e não a da vizinha
	items := newMenuItems()
	opened := make(chan string, 2)

	go watchMenu(items, Callbacks{
		ShowPopup:     func() { opened <- "popup" },
		ShowDashboard: func() { opened <- "dashboard" },
		Quit:          func() { opened <- "quit" },
	})

	items.popup.ClickedCh <- struct{}{}
	expectOpened(testingContext, opened, "popup")

	items.dashboard.ClickedCh <- struct{}{}
	expectOpened(testingContext, opened, "dashboard")
}

func TestWatchMenuStopsAfterQuit(testingContext *testing.T) {
	// triste: depois de Sair, ninguém continua esperando clique de janela
	items := newMenuItems()
	opened := make(chan string, 2)
	finished := make(chan struct{})

	go func() {
		watchMenu(items, Callbacks{
			ShowPopup:     func() { opened <- "popup" },
			ShowDashboard: func() { opened <- "dashboard" },
			Quit:          func() { opened <- "quit" },
		})
		close(finished)
	}()

	items.quit.ClickedCh <- struct{}{}
	expectOpened(testingContext, opened, "quit")

	select {
	case <-finished:
	case <-time.After(time.Second):
		testingContext.Fatal("watchMenu deveria ter terminado depois do Sair")
	}
}

func expectOpened(testingContext *testing.T, opened <-chan string, expected string) {
	testingContext.Helper()

	select {
	case got := <-opened:
		if got != expected {
			testingContext.Errorf("esperava %q, veio %q", expected, got)
		}
	case <-time.After(time.Second):
		testingContext.Fatalf("timeout esperando %q", expected)
	}
}
