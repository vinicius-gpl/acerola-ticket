// Package assets embeds the icon files into the compiled binary, so the
// agent is a single .exe with no external file dependency at runtime.
//
// Go's //go:embed cannot reach outside this package's directory (no ".."
// in patterns), so these are working copies of the canonical files kept at
// the project's top-level /icons — see docs/ICONES.md.
package assets

import _ "embed"

//go:embed tray.ico
var TrayICO []byte
