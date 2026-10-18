//go:build !windows

package main

import "log"

func main() { log.Fatal("service: Windows is required") }
