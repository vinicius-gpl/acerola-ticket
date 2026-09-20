# Ícones

## Origem

Os quatro SVGs de origem estão em `icons/` (cópia de `Documents/Acerola/icons/`):

- `ic_launcher.svg` — a arte completa, fundo + fruta, 1254×1254. **É o que usamos** para gerar o
  ícone da bandeja e o favicon do painel.
- `ic_launcher_background.svg` / `ic_launcher_foreground.svg` — a mesma arte separada em duas
  camadas (fundo sólido e fruta). Mantidos para referência caso um dia seja preciso recompor o
  ícone com um fundo diferente (ex: variante para tema claro do Windows).
- `ic_launcher_monochrome.svg` — a mesma silhueta em preto sólido, sem cor. Não usada nesta fase
  (nenhum dos dois modos pede um ícone monocromático), mantida para a variante adaptável de ícone
  do Windows 11 (`ROADMAP.md`).

## Por que converter para .ico

A API de bandeja do Windows (`fyne.io/systray`, e a API nativa do Windows por trás dela) espera um
`.ico` — não aceita SVG diretamente. O painel web, ao contrário, é HTML servido por um navegador
moderno, que renderiza SVG nativamente como favicon; por isso `web/favicon.svg` é só uma cópia do
SVG, sem conversão.

## Ferramenta usada

Nenhuma ferramenta externa (Inkscape, ImageMagick, `rsvg-convert`) estava disponível no ambiente
de build, e instalar uma dependeria da máquina de quem compila — frágil para um projeto que deve
buildar com só o Go instalado. A conversão foi feita com uma ferramenta própria, escrita em Go:
**`cmd/icongen`**.

- **Rasterização** (SVG → pixels): `github.com/srwiley/oksvg` faz o parse do SVG e
  `github.com/srwiley/rasterx` desenha (rasteriza) o resultado num `image.RGBA` do Go, em
  qualquer resolução pedida.
- **Empacotamento `.ico`**: escrito à mão em `cmd/icongen/main.go` (`writeICO`), no formato
  moderno de ICO que embute PNGs por dentro (suportado desde o Windows Vista) — mais simples que
  reimplementar o encoder BMP/DIB do formato ICO clássico, e evita puxar mais uma dependência só
  para isso.

Essa ferramenta **não faz parte do binário final** do agente (`cmd/agent`) — é rodada uma vez, o
resultado (`icons/tray.ico`) é commitado, e o agente só embute esse arquivo já pronto (via
`internal/assets`, ver `ARQUITETURA.md`). Isso mantém o binário do agente livre de uma dependência
de rasterização de SVG que ele nunca usa em produção.

## Como gerar (ou regenerar) o .ico

```bash
cd acerola/agent
go run ./cmd/icongen -src icons/ic_launcher.svg -out icons/tray.ico -sizes 16,32,48,256
cp icons/tray.ico internal/assets/tray.ico   # cópia embutida no binário — ver ARQUITETURA.md
```

Tamanhos incluídos: **16×16 e 32×32** (os dois exigidos, usados pela bandeja em telas normal e
HiDPI) mais **48×48 e 256×256** (tamanhos padrão do Windows para o Explorer e a caixa "Alt+Tab" —
comuns o bastante para incluir sem custo extra, já que o `.ico` só cresce ~15 KB por tamanho
extra).

O redimensionamento preserva a proporção do `viewBox` original (1254×1254, quadrado) e usa fundo
transparente fora da arte — não há necessidade de letterboxing aqui porque a arte de origem já é
quadrada.
