//go:build !windows

package machine

import "errors"

func Installed() bool                { return false }
func Decrypt(string) (string, error) { return "", errors.New("machine: Windows DPAPI is required") }

func trustedFile(string) error       { return errors.New("machine: Windows is required") }
func ValidateDirectory(string) error { return errors.New("machine: Windows is required") }
