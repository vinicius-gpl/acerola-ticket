// Package web embute os arquivos estáticos do painel no binário do agente.
// A diretiva embed só alcança arquivos dentro da própria árvore de
// diretórios, e é por isso que o HTML/CSS/JS do painel moram aqui em vez de
// serem copiados de outro lugar (diferente de internal/assets, que precisa
// de uma cópia porque o .ico de origem mora fora da árvore de
// internal/tray).
package web

import "embed"

//go:embed index.html styles.css app.js favicon.svg
var FS embed.FS
