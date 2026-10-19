package installer

import (
	"context"
	"errors"
	"os"
	"os/exec"
	"path/filepath"
	"syscall"
)

// A assinatura Authenticode precisa ser válida E pertencer ao certificado fixado pelo TI.
func VerifySignature(ctx context.Context, path, fingerprint string) error {
	script := `$ErrorActionPreference='Stop'; $s=Get-AuthenticodeSignature -LiteralPath $env:ACEROLA_UPDATE_FILE; if ($s.Status -ne 'Valid' -or $null -eq $s.SignerCertificate) { exit 1 }; $h=[System.Security.Cryptography.SHA256]::Create(); $f=([BitConverter]::ToString($h.ComputeHash($s.SignerCertificate.RawData))).Replace('-',''); if ($f -ne $env:ACEROLA_SIGNER_SHA256) { exit 2 }`
	command := exec.CommandContext(ctx, filepath.Join(os.Getenv("SystemRoot"), "System32", "WindowsPowerShell", "v1.0", "powershell.exe"), "-NoProfile", "-NonInteractive", "-Command", script)
	command.Env = append(os.Environ(), "ACEROLA_UPDATE_FILE="+path, "ACEROLA_SIGNER_SHA256="+fingerprint)
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
	if command.Run() != nil {
		return errors.New("invalid or unexpected Authenticode signer")
	}
	return nil
}

// Não usa CommandContext: o MSI vai parar este serviço durante o upgrade, mas precisa continuar vivo.
func Install(path, logPath string) error {
	command := exec.Command(filepath.Join(os.Getenv("SystemRoot"), "System32", "msiexec.exe"), "/i", path, "/qn", "/norestart", "REBOOT=ReallySuppress", "/L*v", logPath)
	command.SysProcAttr = &syscall.SysProcAttr{HideWindow: true, CreationFlags: 0x00000200} // CREATE_NEW_PROCESS_GROUP
	if err := command.Start(); err != nil {
		return err
	}
	go func() { _ = command.Wait() }()
	return nil
}
