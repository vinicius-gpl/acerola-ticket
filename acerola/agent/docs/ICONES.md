# Ícones

## Origem

Os quatro SVGs de origem estão em `icons/` (cópia de `Documents/Acerola/icons/`):

- `ic_launcher_foreground.svg` — só a fruta, sem fundo, 1254×1254. **É o que usamos para o ícone
  da bandeja** (`icons/tray.ico`): o Windows já desenha o próprio fundo do tray/taskbar atrás do
  ícone, então um fundo sólido embutido no `.ico` brigaria com o tema do usuário (escuro, claro,
  cor de destaque) em vez de se misturar a ele.
- `ic_launcher.svg` — a arte completa, fundo + fruta. Usada como logo dentro da própria interface
  (favicon do WebView, cabeçalho da popup e do dashboard) — ali um fundo fixo não compete com
  nada, é só a marca.
- `ic_launcher_background.svg` — o fundo sólido isolado. Mantido para referência caso um dia seja
  preciso recompor o ícone de outro jeito.
- `ic_launcher_monochrome.svg` — a mesma silhueta em preto sólido, sem cor. Não usada nesta fase,
  mantida para a variante adaptável de ícone do Windows 11 (`ROADMAP.md`).

## Por que converter para .ico

A API de bandeja do Windows (`fyne.io/systray`, e a API nativa do Windows por trás dela) espera um
`.ico` — não aceita SVG diretamente. O mesmo vale pro ícone do executável e do instalador
(`build/windows/icon.ico`). Já a interface Svelte, dentro do WebView2, renderiza SVG nativamente;
por isso `svelte/public/favicon.svg` é só uma cópia do SVG, sem conversão — o Vite serve qualquer
coisa em `public/` direto na raiz do build.

## Ferramenta usada

Nenhuma ferramenta externa (Inkscape, ImageMagick, `rsvg-convert`) estava disponível no ambiente
de build, e instalar uma dependeria da máquina de quem compila — frágil para um projeto que deve
buildar com só o Go instalado. A conversão foi feita com uma ferramenta própria, escrita em Go:
**`src-go/cmd/icongen`**.

- **Rasterização** (SVG → pixels): `github.com/srwiley/oksvg` faz o parse do SVG e
  `github.com/srwiley/rasterx` desenha (rasteriza) o resultado num `image.RGBA` do Go, em
  qualquer resolução pedida.
- **Empacotamento `.ico`**: escrito à mão em `src-go/cmd/icongen/main.go` (`writeICO`), no formato
  moderno de ICO que embute PNGs por dentro (suportado desde o Windows Vista) — mais simples que
  reimplementar o encoder BMP/DIB do formato ICO clássico, e evita puxar mais uma dependência só
  para isso.

Essa ferramenta **não faz parte do binário final** do agente — é rodada uma vez, o resultado
(`icons/tray.ico`) é commitado, e o agente só embute esse arquivo já pronto (via `src-go/assets`,
ver `ARQUITETURA.md`). Isso mantém o binário do agente livre de uma dependência de rasterização
de SVG que ele nunca usa em produção.

## Como gerar (ou regenerar) o .ico

```bash
cd acerola/agent
go run ./src-go/cmd/icongen -src icons/ic_launcher_foreground.svg -out icons/tray.ico -sizes 16,32,48,256
cp icons/tray.ico src-go/assets/tray.ico     # cópia embutida no binário — ver ARQUITETURA.md
cp icons/tray.ico build/windows/icon.ico     # ícone do .exe e do instalador (convenção do Wails)
```

`build/appicon.png` (usado por algumas etapas de empacotamento do Wails) é gerado à parte, a
partir de `ic_launcher.svg` (a versão com fundo — é o app inteiro, não o ícone da bandeja), numa
resolução maior (512×512). Só precisa rodar uma vez, não é um fluxo repetido como o `.ico`.

Tamanhos incluídos: **16×16 e 32×32** (os dois exigidos, usados pela bandeja em telas normal e
HiDPI) mais **48×48 e 256×256** (tamanhos padrão do Windows para o Explorer e a caixa "Alt+Tab" —
comuns o bastante para incluir sem custo extra, já que o `.ico` só cresce ~15 KB por tamanho
extra).

O redimensionamento preserva a proporção do `viewBox` original (1254×1254, quadrado) e usa fundo
transparente fora da arte — não há necessidade de letterboxing aqui porque a arte de origem já é
quadrada.
