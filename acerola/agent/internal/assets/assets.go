// Package assets embute os arquivos de ícone no binário compilado, pra o
// agente ser um .exe único, sem dependência de arquivo externo em tempo de
// execução.
//
// O //go:embed do Go não alcança fora do diretório deste pacote (sem ".."
// nos padrões), então isto aqui é uma cópia de trabalho dos arquivos
// canônicos mantidos em /icons na raiz do projeto — veja docs/ICONES.md.
package assets

import _ "embed"

//go:embed tray.ico
var TrayICO []byte
