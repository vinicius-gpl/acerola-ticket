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
		testingContext.Error("ShowPopup should have run")
	}
	if !dashboardCalled {
		testingContext.Error("ShowDashboard should have run")
	}
	if !quitCalled {
		testingContext.Error("Quit should have run")
	}
}

// newClickChannels monta as entradas do menu sem bandeja nenhuma: só os canais
// de clique, que é o que watchMenu consome.
func newClickChannels() (dashboard, quit *systray.MenuItem) {
	return &systray.MenuItem{ClickedCh: make(chan struct{}, 1)},
		&systray.MenuItem{ClickedCh: make(chan struct{}, 1)}
}

func TestWatchMenuRoutesEachItemToItsAction(testingContext *testing.T) {
	// feliz: cada entrada do menu chama a ação dela, e não a da vizinha
	dashboard, quit := newClickChannels()
	done := make(chan string, 2)

	go watchMenu(dashboard, quit, Callbacks{
		ShowPopup:     func() { done <- "popup" },
		ShowDashboard: func() { done <- "dashboard" },
		Quit:          func() { done <- "quit" },
	})

	dashboard.ClickedCh <- struct{}{}
	expectDone(testingContext, done, "dashboard")
}

func TestWatchMenuStopsAfterQuit(testingContext *testing.T) {
	// triste: depois de Sair, ninguém continua esperando clique de janela
	dashboard, quit := newClickChannels()
	done := make(chan string, 2)
	finished := make(chan struct{})

	go func() {
		watchMenu(dashboard, quit, Callbacks{
			ShowPopup:     func() { done <- "popup" },
			ShowDashboard: func() { done <- "dashboard" },
			Quit:          func() { done <- "quit" },
		})
		close(finished)
	}()

	quit.ClickedCh <- struct{}{}
	expectDone(testingContext, done, "quit")

	select {
	case <-finished:
	case <-time.After(time.Second):
		testingContext.Fatal("watchMenu should stop after Quit")
	}
}

func expectDone(testingContext *testing.T, done <-chan string, expected string) {
	testingContext.Helper()

	select {
	case got := <-done:
		if got != expected {
			testingContext.Errorf("expected %q, got %q", expected, got)
		}
	case <-time.After(time.Second):
		testingContext.Fatalf("timed out waiting for %q", expected)
	}
}
