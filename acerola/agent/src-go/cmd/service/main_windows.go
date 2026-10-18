// O binário do serviço não importa Wails nem cria janelas na sessão zero.
package main

import (
	"context"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/machine"
	agentservice "github.com/vinicius-gpl/acerola-ticket/acerola/agent/src-go/service"
	"golang.org/x/sys/windows/svc"
	"golang.org/x/sys/windows/svc/mgr"
)

type handler struct{}

func (handler) Execute(_ []string, requests <-chan svc.ChangeRequest, changes chan<- svc.Status) (bool, uint32) {
	changes <- svc.Status{State: svc.StartPending}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan struct{})
	go func() { defer close(done); agentservice.Run(ctx) }()
	changes <- svc.Status{State: svc.Running, Accepts: svc.AcceptStop | svc.AcceptShutdown}
	for request := range requests {
		switch request.Cmd {
		case svc.Interrogate:
			changes <- request.CurrentStatus
		case svc.Stop, svc.Shutdown:
			changes <- svc.Status{State: svc.StopPending, WaitHint: 10000}
			cancel()
			select {
			case <-done:
			case <-time.After(8 * time.Second):
			}
			return false, 0
		}
	}
	return false, 0
}

func recovery() {
	manager, err := mgr.Connect()
	if err != nil {
		log.Printf("service: cannot configure recovery: %v", err)
		return
	}
	defer func() { _ = manager.Disconnect() }()
	service, err := manager.OpenService(machine.ServiceName)
	if err != nil {
		log.Printf("service: cannot configure recovery: %v", err)
		return
	}
	defer func() { _ = service.Close() }()
	actions := []mgr.RecoveryAction{{Type: mgr.ServiceRestart, Delay: time.Minute}, {Type: mgr.ServiceRestart, Delay: time.Minute}, {Type: mgr.ServiceRestart, Delay: time.Minute}}
	if err = service.SetRecoveryActions(actions, 86400); err != nil {
		log.Printf("service: cannot configure recovery actions: %v", err)
	}
}

func main() {
	directory := machine.Directory()
	_ = os.MkdirAll(directory, 0700)
	logPath := filepath.Join(directory, "service.log")
	if stat, err := os.Stat(logPath); err == nil && stat.Size() > 5*1024*1024 {
		_ = os.Remove(logPath + ".old")
		_ = os.Rename(logPath, logPath+".old")
	}
	file, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0600)
	if err == nil {
		defer func() { _ = file.Close() }()
		log.SetOutput(file)
	}
	if err := machine.ValidateDirectory(directory); err != nil {
		log.Fatalf("service: directory validation failed: %v", err)
	}
	recovery()
	if err = svc.Run(machine.ServiceName, handler{}); err != nil {
		log.Fatal(err)
	}
}
