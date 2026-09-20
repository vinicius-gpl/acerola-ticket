// Package web embeds the dashboard's static assets into the agent binary.
// The embed directive can only reach files inside this same directory tree,
// which is why the dashboard's HTML/CSS/JS live here rather than being
// copied in from elsewhere (contrast with internal/assets, which does need
// a copy because its source .ico lives outside internal/tray's tree).
package web

import "embed"

//go:embed index.html styles.css app.js favicon.svg
var FS embed.FS
