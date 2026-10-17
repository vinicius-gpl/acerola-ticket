package machine

import (
	"encoding/base64"
	"testing"
	"unsafe"

	"golang.org/x/sys/windows"
)

func TestMachineDPAPI(t *testing.T) {
	// feliz: o formato é o mesmo produzido por ProtectedData.LocalMachine do provisionamento.
	plain := []byte("fixture-machine-token")
	input := windows.DataBlob{Size: uint32(len(plain)), Data: &plain[0]}
	var output windows.DataBlob
	if err := windows.CryptProtectData(&input, nil, nil, 0, nil, windows.CRYPTPROTECT_LOCAL_MACHINE|windows.CRYPTPROTECT_UI_FORBIDDEN, &output); err != nil {
		t.Fatal(err)
	}
	defer func() { _, _ = windows.LocalFree(windows.Handle(unsafe.Pointer(output.Data))) }()
	encoded := base64.StdEncoding.EncodeToString(unsafe.Slice(output.Data, output.Size))
	token, err := Decrypt(encoded)
	if err != nil || token != string(plain) {
		t.Fatalf("DPAPI roundtrip failed: %v", err)
	}
	// triste: não transforma cifra inválida em uma máquina configurada.
	for _, invalid := range []string{"", "not-base64", base64.StdEncoding.EncodeToString([]byte("invalid DPAPI data"))} {
		if _, err := Decrypt(invalid); err == nil {
			t.Fatal("expected DPAPI failure")
		}
	}
}

func TestMachineOwners(t *testing.T) {
	// feliz: a identidade administrativa fixa não depende do idioma do Windows.
	for _, text := range []string{"S-1-5-18", "S-1-5-32-544"} {
		sid, err := windows.StringToSid(text)
		if err != nil {
			t.Fatal(err)
		}
		if !trustedOwner(sid) {
			t.Fatal("expected trusted system or administrators owner")
		}
	}
	// triste: um arquivo pré-plantado por uma conta comum não vira configuração privilegiada.
	user, err := windows.StringToSid("S-1-5-21-1-2-3-1001")
	if err != nil {
		t.Fatal(err)
	}
	if trustedOwner(user) || trustedOwner(nil) {
		t.Fatal("must refuse an untrusted owner")
	}
}
