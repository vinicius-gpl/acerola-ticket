# Ícones

## Origem

Os quatro SVGs de origem estão em `icons/` (cópia de `Documents/Acerola/icons/`):

- `ic_launcher_foreground.svg` — só a fruta, sem fundo, 1254×1254. **É o único usado em todo o
  projeto** — bandeja, favicon do WebView, cabeçalho da popup e do dashboard, `build/appicon.png`.
- `ic_launcher.svg` — a arte completa, fundo + fruta. **Não é usada em lugar nenhum, de
  propósito**: por mais que um fundo fixo pareça inofensivo dentro da própria interface, a decisão
  do projeto é sempre usar só a fruta, sem exceção — inclusive porque um fundo sólido embutido no
  `.ico` da bandeja brigaria com o tema do usuário (escuro, claro, cor de destaque) em vez de se
  misturar a ele.
- `ic_launcher_background.svg` — o fundo sólido isolado. Mantido só como peça de referência.
- `ic_launcher_monochrome.svg` — a mesma silhueta em preto sólido, sem cor. Não usada nesta fase,
  mantida para a variante adaptável de ícone do Windows 11 (`ROADMAP.md`).

## Por que converter para .ico

A API de bandeja do Windows (`fyne.io/systray`, e a API nativa do Windows por trás dela) espera um
`.ico` — não aceita SVG diretamente. O mesmo vale pro ícone do executável e do instalador
(`build/windows/icon.ico`). Já a interface Svelte, dentro do WebView2, renderiza SVG nativamente;
por isso `svelte/public/favicon.svg` é só uma cópia do SVG (`ic_launcher_foreground.svg`), sem
conversão — o Vite serve qualquer coisa em `public/` direto na raiz do build.

## Ferramenta usada

Nenhuma ferramenta externa (Inkscape, ImageMagick, `rsvg-convert`) estava disponível no ambiente
de build, e instalar uma dependeria da máquina de quem compila — frágil para um projeto que deve
buildar com só o Go instalado. A conversão foi feita com uma ferramenta própria, escrita em Go:
**`src-go/cmd/icongen`**.

- **Rasterização** (SVG → pixels): `github.com/srwiley/oksvg` faz o parse do SVG e
  `github.com/srwiley/rasterx` desenha (rasteriza) o resultado num `image.RGBA` do Go, em
  qualquer resolução pedida.
- **Saída**: se `-out` termina em `.ico`, empacota (à mão, `writeICO`) no formato moderno de ICO
  que embute PNGs por dentro (suportado desde o Windows Vista) — mais simples que reimplementar o
  encoder BMP/DIB clássico. Se termina em `.png`, escreve o PNG de um tamanho só direto (usado só
  pra `build/appicon.png`).

Essa ferramenta **não faz parte do binário final** do agente — é rodada uma vez, o resultado
(`icons/tray.ico`, `build/appicon.png`) é commitado, e o agente só embute o `.ico` já pronto (via
`src-go/assets`, ver `ARQUITETURA.md`). Isso mantém o binário do agente livre de uma dependência
de rasterização de SVG que ele nunca usa em produção.

## Como gerar (ou regenerar)

```bash
cd acerola/agent
go run ./src-go/cmd/icongen -src icons/ic_launcher_foreground.svg -out icons/tray.ico -sizes 16,32,48,256 -zoom 1.44
cp icons/tray.ico src-go/assets/tray.ico     # cópia embutida no binário — ver ARQUITETURA.md
cp icons/tray.ico build/windows/icon.ico     # ícone do .exe e do instalador (convenção do Wails)

go run ./src-go/cmd/icongen -src icons/ic_launcher_foreground.svg -out build/appicon.png -sizes 512 -zoom 1.44
cp icons/ic_launcher_foreground.svg svelte/public/favicon.svg
```

**`-zoom 1.44`**: a arte de origem tem uma margem de respiro ao redor da fruta (comum em ícones
pensados como "foreground" de ícone adaptativo — o sistema operacional normalmente aplica uma
máscara e escala por cima). Em 512px essa margem passa despercebida, mas reduzida pra 16×16 na
bandeja do Windows ela faz a fruta parecer pequena dentro do quadro, perto de ícones de outros
apps que preenchem o espaço todo. `-zoom` desenha o SVG maior que o quadro e centralizado,
cortando essa margem nas bordas — implementado em `rasterize()` (`icongen/main.go`) ajustando o
retângulo de destino do `oksvg` pra ficar maior que o canvas final, então parte do desenho cai
fora e é naturalmente recortada pelo tamanho do `image.RGBA`. Começou em 1.2 (+20%); depois de ver
o ícone da bandeja de perto, ainda parecia pequeno perto dos outros apps, então foi pra 1.44
(mais +20% em cima do 1.2). Usamos o mesmo zoom em todo lugar (bandeja e `appicon.png`) por
consistência — é a mesma arte, o mesmo recorte, só o tamanho final muda.

Tamanhos incluídos no `.ico` da bandeja: **16×16 e 32×32** (os dois exigidos, usados em telas
normal e HiDPI) mais **48×48 e 256×256** (tamanhos padrão do Windows para o Explorer e a caixa
"Alt+Tab" — comuns o bastante para incluir sem custo extra, já que o `.ico` só cresce ~15 KB por
tamanho extra).
