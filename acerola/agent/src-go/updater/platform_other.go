//go:build !windows

package updater

import (
	"context"
	"errors"
)

func VerifySignature(context.Context, string, string) error {
	return errors.New("updater: Windows is required")
}
func Install(string, string) error { return errors.New("updater: Windows is required") }
