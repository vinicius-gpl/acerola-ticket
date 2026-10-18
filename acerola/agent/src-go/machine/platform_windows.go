package machine

import (
	"encoding/base64"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
	"unsafe"

	"golang.org/x/sys/windows"
)

func Installed() bool {
	manager, err := windows.OpenSCManager(nil, nil, windows.SC_MANAGER_CONNECT)
	if err != nil {
		return false
	}
	defer func() { _ = windows.CloseServiceHandle(manager) }()
	name, err := windows.UTF16PtrFromString(ServiceName)
	if err != nil {
		return false
	}
	service, err := windows.OpenService(manager, name, windows.SERVICE_QUERY_STATUS)
	if err != nil {
		return false
	}
	defer func() { _ = windows.CloseServiceHandle(service) }()
	return true
}

// A ACL do diretório limita quem lê; a DPAPI LocalMachine permite ao LocalSystem abrir o token.
func Decrypt(cipher string) (string, error) {
	data, err := base64.StdEncoding.DecodeString(cipher)
	if err != nil || len(data) == 0 {
		return "", errors.New("machine: invalid encrypted credential")
	}
	input := windows.DataBlob{Size: uint32(len(data)), Data: &data[0]}
	var output windows.DataBlob
	if err = windows.CryptUnprotectData(&input, nil, nil, 0, nil, windows.CRYPTPROTECT_UI_FORBIDDEN, &output); err != nil {
		return "", err
	}
	defer func() { _, _ = windows.LocalFree(windows.Handle(unsafe.Pointer(output.Data))) }()
	return string(unsafe.Slice(output.Data, output.Size)), nil
}

// Nunca executa configuração pré-plantada por um usuário comum antes da instalação do MSI.
func trustedFile(path string) error {
	info, err := os.Lstat(path)
	if err != nil {
		return err
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return errors.New("machine: reparse points are not allowed")
	}
	descriptor, err := windows.GetNamedSecurityInfo(path, windows.SE_FILE_OBJECT, windows.OWNER_SECURITY_INFORMATION|windows.DACL_SECURITY_INFORMATION)
	if err != nil {
		return err
	}
	owner, _, err := descriptor.Owner()
	if err != nil {
		return err
	}
	if !trustedOwner(owner) {
		if control, _, err := descriptor.Control(); err == nil && control&windows.SE_DACL_PROTECTED != 0 {
			if systemSid, err := windows.CreateWellKnownSid(windows.WinLocalSystemSid); err == nil {
				_ = windows.SetNamedSecurityInfo(path, windows.SE_FILE_OBJECT, windows.OWNER_SECURITY_INFORMATION, systemSid, nil, nil, nil)
			}
			return nil
		}
		return errors.New("machine: machine files must be owned by SYSTEM or Administrators")
	}
	return nil
}

func ValidateDirectory(path string) error {
	return filepath.WalkDir(path, func(path string, _ fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		return trustedFile(path)
	})
}

func trustedOwner(owner *windows.SID) bool {
	return owner != nil && (owner.IsWellKnown(windows.WinLocalSystemSid) || owner.IsWellKnown(windows.WinBuiltinAdministratorsSid))
}
