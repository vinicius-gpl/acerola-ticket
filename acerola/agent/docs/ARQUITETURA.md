# Arquitetura

Agente de monitoramento de sistema para Windows: um ícone na bandeja (visão rápida, a "popup") e
uma janela com painel completo (visão densa, tipo btop, o "dashboard"). Os dois são views da
**mesma janela nativa** de um único app Wails — não duas janelas separadas, não um navegador
externo. Esta é a fase de prova de conceito: tudo roda localmente, nada sai desta máquina. Veja
`ROADMAP.md` para o que vem depois.

> Esta é a segunda versão da arquitetura. A primeira usava `net/http` + uma página servida no
> navegador; foi abandonada porque o pedido passou a ser uma experiência de app nativo (janela
> própria, tipo NetBird/Tailscale), não um site aberto numa aba.

## Por que Wails (e não Fyne, Gio, Qt, GTK)

O pedido era: janela nativa embutida, mas com a produtividade de construir a interface em
HTML/CSS/JS (Svelte) em vez de widgets desenhados em Go.

- **Fyne, Gio**: frameworks de UI **em Go puro** — sem HTML/CSS/JS. Descartados porque o pedido
  era explicitamente Svelte na interface; usar um desses jogaria fora todo o reaproveitamento do
  projeto de referência (tema, componentes, stack de frontend).
- **Qt (via binding Go), GTK**: frameworks de UI nativos maduros, mas pesados pra instalar
  (dependem de toolchain C++/GTK no Windows) e também não usam HTML/CSS — mesmo problema do Fyne
  pra este caso, com custo de instalação maior.
- **Wails**: cria uma janela nativa do Windows com um **WebView2** dentro — o HTML/CSS/JS roda
  ali, e o Go conversa com esse frontend por eventos/chamadas de método, sem precisar de
  servidor HTTP nem WebSocket manual. É a combinação mais direta entre "janela nativa" e
  "interface em Svelte" — o WebView2 já vem instalado por padrão no Windows 10/11 (o
  `wails doctor` confirmou a versão instalada nesta máquina).

Ficou entre Wails v2 (estável, muito documentado) e v3 (ainda beta, com API diferente — usa
`application.New()` em vez de `wails.Run()`, sistema de eventos próprio). Fomos de **v2.16.0**
por ser a versão de produção; v3 fica pra quando amadurecer.

## Por que cada peça da stack

**Coleta — `github.com/shirou/gopsutil/v4`.** Sem mudança em relação à primeira versão: é a
biblioteca padrão de fato para métricas de sistema em Go, com suporte a Windows via WMI/syscalls
nativos.

**Bandeja — `fyne.io/systray`.** Também sem mudança — é só o pacote `systray` do Fyne (não o
framework de UI completo), independente do resto.

**Frontend — Svelte 5 + Vite + Tailwind v4 + shadcn-svelte**, portado do projeto de referência
`acerola-reader/acerola/desktop` (ver `REAPROVEITAMENTO.md` para o que foi copiado, adaptado ou
deixado de fora). Sem SvelteKit — o app tem só duas telas, então o roteamento de arquivos e o
adapter da SvelteKit resolveriam um problema que não existe aqui; um Svelte+Vite comum com
`svelte-spa-router` (2 rotas: `/popup`, `/dashboard`) já basta.

**Layout do dashboard — inspirado no ReUI.** O ReUI (`reui.io`, biblioteca de blocos sobre
shadcn/ui) organiza dashboard em três camadas: uma faixa de KPIs no topo (valor grande + selo de
tendência + sparkline inline), gráficos maiores no meio, e uma tabela de ação embaixo. Seguimos
essa mesma composição (`dashboard.svelte`): CPU/Memória/Rede/Disco como `AcerolaMetricTile` no
topo, os mesmos quatro como gráficos maiores logo abaixo (com mais contexto — núcleos, volumes de
disco), e a tabela de processos + inventário por último. A popup usa o mesmo `AcerolaMetricTile`
das duas telas, só que empilhado numa coluna só (é a versão "de relance", perto da bandeja) —
outro princípio do ReUI que seguimos: os mesmos tokens de card, cor e componente aparecem em
qualquer densidade de tela, só a composição muda.

**Storybook + testes de componente.** Cada `acerola-*` tem um `.stories.svelte`
(`@storybook/addon-svelte-csf`, o mesmo formato do projeto de referência) e um `.test.ts`
(Vitest + `@testing-library/svelte`), cobrindo pelo menos um caso feliz e um caso limite. O
`@storybook/addon-vitest` (que rodaria as stories como teste, via Chromium real) ficou de fora —
baixar o Chromium do Playwright trava por rede neste ambiente (mesmo problema do bootstrap do
WebView2 — ver "Como o Go fala com o Svelte" acima). `npm run storybook` (revisão visual) e
`npm test` (Vitest comum, ambiente jsdom) não dependem disso. jsdom não implementa canvas 2D nem
`Path2D` — `AcerolaSparkline` usa `uPlot`, que precisa dos dois — então
`svelte/src/test-setup.ts` injeta um `getContext` e um `Path2D` que aceitam qualquer
chamada como no-op, só pra o componente montar sem lançar exceção (os testes verificam que ele
monta, não o desenho em si).

**Gráficos — `uPlot`.** Escolhido no lugar de Chart.js porque é ordens de grandeza mais leve
(~45 KB vs. várias centenas de KB) e feito especificamente pra série temporal de alta frequência
— exatamente o caso de CPU/RAM/rede/disco atualizando a cada segundo. Chart.js é mais genérico
(barras, pizza, radar…), peso que não se paga aqui.

**Rasterização de ícone — `github.com/srwiley/oksvg` + `github.com/srwiley/rasterx`.** Sem
mudança — só usada pela ferramenta `src-go/cmd/icongen`, não pelo agente em produção (ver
`ICONES.md`).

## Como o Go fala com o Svelte (sem servidor, sem WebSocket manual)

O Wails resolve esse transporte nativamente:

- **Go → Svelte**: `runtime.EventsEmit(ctx, "metrics:snapshot", snapshot)` no Go,
  `EventsOn("metrics:snapshot", callback)` no Svelte (`svelte/src/lib/metrics/store.svelte.ts`).
  O `metrics.Broadcaster` (mesma peça da versão anterior, ver abaixo) permanece o único lugar que
  chama `Collector.Snapshot` — só que agora, em vez de escrever num canal por aba de navegador,
  ele empurra pro frontend via evento nativo.
- **Svelte → Go**: métodos do struct `App` (`app.go`) expostos via `Bind` no `wails.Run(...)`
  viram funções JS chamáveis diretamente (`svelte/wailsjs/go/main/App.js`, gerado pelo próprio
  Wails). A popup chama `HideWindow()` ao perder o foco, e o dashboard chama o mesmo método pelo
botão de fechar do próprio cabeçalho.

```
Collector (gopsutil)
      │  a cada 1s
      ▼
 Broadcaster.tick() ── guarda "latest" ──── (nada mais lê Latest() nesta versão)
      │
      └── runtime.EventsEmit("metrics:snapshot", snap) ──► window.runtime (Wails) ──► Svelte
```

A pegadinha do gopsutil que motivou o `Broadcaster` na primeira versão continua valendo:
`cpu.Percent(0, ...)` guarda o "instante da última chamada" numa variável **global do pacote do
gopsutil**, então só uma goroutine pode chamar `Collector.Snapshot` — daí o Broadcaster continuar
sendo o único chamador, mesmo sem mais precisar multiplexar pra vários assinantes concorrentes
(agora há só um: o próprio frontend, que o Wails já distribui pra qualquer view escutando).

## Bandeja + janela Wails: por que a bandeja nasce dentro do `OnStartup`

`main()` só chama `wails.Run(...)` — é o padrão de todo exemplo do Wails, e `wails.Run` bloqueia
até o app fechar. A bandeja (`tray.Run`, que chama `systray.Run` e bloqueia esperando clique) é
disparada **de dentro do `OnStartup`** (`app.go`), numa goroutine própria, não em `main()`:

```go
func main() {
    wails.Run(&options.App{ ... StartHidden: true, OnStartup: app.startup ... })
}

func (a *App) startup(ctx context.Context) {
    a.ctx = ctx
    go tray.Run(tray.Callbacks{ ShowPopup: ..., ShowDashboard: ..., Quit: ... })
}
```

Isso não é só estilo — é uma exigência descoberta rodando `wails build` de verdade. Gerar os
bindings JS/TS não é análise estática: o Wails **compila e roda o próprio binário** com uma tag de
build especial (`-tags bindings`), que troca `wails.Run` internamente por uma versão que só
imprime os métodos expostos em JSON e sai (`internal/app/app_bindings.go`, atrás de
`//go:build bindings`). O pacote garante que **`OnStartup` nunca é chamado nesse modo** (está numa
lista explícita de `bindingExemptions`) — só por isso é seguro colocar a bandeja ali. Na primeira
versão deste app, `tray.Run()` estava em `main()`, rodando incondicionalmente; como `systray.Run`
bloqueia esperando clique pra sempre, o binário temporário de geração de bindings nunca terminava
e `wails build` travava para sempre em "Generating bindings". Mover a bandeja pro `OnStartup`
resolveu — ali ela só roda quando o app está realmente abrindo uma janela de verdade.

`fyne.io/systray` e o Wails cada um trava a própria goroutine numa thread do sistema operacional
por dentro (`runtime.LockOSThread()` — confirmado lendo `systray.go:37` e `winc/app.go:23` do
Wails), então a bandeja rodar numa goroutine disparada de dentro do `OnStartup` em vez de
`main()` não muda o fato de que cada um cria sua própria janela/loop de mensagens do Windows.

A janela do Wails nasce **escondida** (`StartHidden: true`) e só aparece quando a bandeja pede
(clique esquerdo → popup, "Abrir Dashboard" no menu → dashboard). Fechar a janela (Alt+F4, X)
não encerra o processo — só esconde (`HideWindowOnClose: true`); quem encerra de verdade é
"Sair" no menu da bandeja.

`Frameless: true` tira toda a moldura nativa do Windows — sem barra de título, sem X, sem sombra
do sistema. Isso é proposital pra popup (é uma "telinha" que aparece perto da bandeja, não uma
janela de verdade), mas o Wails só tem uma opção de moldura pra janela inteira, então o dashboard
herda a mesma ausência de moldura. Por isso o dashboard tem seu próprio botão de fechar
(`XIcon`, no cabeçalho, chamando `HideWindow()`) e ambas as views desenham borda + sombra via CSS
(`border`, `shadow-2xl` em `popup.svelte`/`dashboard.svelte`) — sem isso a janela ficaria um
retângulo sem contorno nenhum flutuando sobre o desktop. `[data-drag-region]` (mapeado pra
`--wails-draggable: drag` em `tailwind.css`) é o que permite arrastar a janela pelo cabeçalho, já
que não existe barra de título nativa pra isso.

No Windows, clique esquerdo e direito no ícone da bandeja já chegam como eventos distintos no
`systray` (`WM_LBUTTONUP`/`WM_RBUTTONUP`, verificado em `systray_windows.go`). Por isso a tray só
registra `SetOnTapped` (clique esquerdo → mostra a popup); sem um handler pro clique direito, o
próprio systray mostra o menu de texto nativo — não precisamos montar esse comportamento na mão.

## Por que nenhum clique da bandeja chama `runtime.*` diretamente

Testando de verdade (`wails build` gerando o `.exe` e rodando), o clique na bandeja **travava o
app inteiro** — a janela não abria e nem outros cliques respondiam mais, ficando só o ícone
parado. A causa: `SetOnTapped(a.ShowPopup)` registra `ShowPopup` pra rodar **direto na thread do
systray**, a mesma que bombeia `WM_LBUTTONUP`/`WM_RBUTTONUP` — e `ShowPopup` chamava
`runtime.WindowShow` (e outras funções do pacote `runtime` do Wails) ali mesmo, síncrono. Duas
janelas nativas diferentes, cada uma com sua própria fila de mensagens travada numa thread só
sua (a do parágrafo acima) — uma chamando direto na fila da outra e esperando resposta é receita
pra deadlock entre as duas.

A correção (`app.go`) foi nunca deixar o código dependurado num clique de bandeja tocar
`runtime.*` diretamente. Existe um canal (`App.actions`) e uma goroutine própria,
`runActions`, iniciada no `OnStartup` — a única que efetivamente chama `runtime.WindowShow`,
`WindowSetSize`, `EventsEmit` etc.:

```go
func (a *App) ShowPopup() {
    a.dispatch(func(ctx context.Context) {
        runtime.WindowShow(ctx) // só executa dentro de runActions
    })
}
```

`ShowPopup`/`ShowDashboard`/`Quit` (chamadas pela bandeja) e `HideWindow` (chamada pelo Svelte,
ver abaixo) só empilham uma função no canal e retornam na hora — nunca esperam a janela
realmente aparecer/sumir. Isso tira a thread do systray da equação: ela nunca fica bloqueada
esperando a janela responder, então não tem como as duas filas de mensagem travarem uma na
outra.

## Onde a popup e o dashboard aparecem na tela

A popup ancora no canto inferior direito da área útil da tela — onde a bandeja do Windows
normalmente vive, imitando o flyout nativo de volume/rede/bateria. O dashboard ancora no canto
inferior esquerdo, do lado oposto, com respiro tanto da borda do monitor quanto da barra de
tarefas. Isso não é `WindowCenter` nem um valor fixo: é `runtime.WindowSetPosition(ctx, x, y)`
calculado a partir da **área útil** do monitor principal (`src-go/screen.WorkArea()`).

"Área útil" (a tela inteira menos a barra de tarefas) importa aqui porque o Wails não expõe
isso — `runtime.ScreenGetAll` só devolve o tamanho total da tela, e usar esse valor pra
posicionar colocaria a janela por baixo da barra de tarefas. `src-go/screen/workarea.go` chama
direto a API nativa do Windows (`SystemParametersInfoW` com `SPI_GETWORKAREA`) — a mesma que o
Explorer usa internamente pra não deixar janela maximizada cobrir a barra de tarefas. Se essa
chamada falhar por qualquer motivo, cai num retângulo de fallback (1920×1040) em vez de travar o
app — errar a posição por alguns pixels é bem menos grave que não abrir.

## Estrutura de pastas

O Wails **exige** que `main.go` e `app.go` fiquem na raiz do projeto — não existe um campo de
configuração equivalente ao `frontend:dir` (que sim existe, e foi usado pra chamar o frontend de
`svelte/` em vez do `frontend/` padrão) pro lado Go. Confirmado lendo
`internal/project/project.go` do próprio Wails: o build sempre compila o pacote `main` a partir
da raiz do projeto (`projectdir`), sem opção de apontar pra uma subpasta. Por isso a raiz tem só
o mínimo que o Wails exige, e todo o resto do código Go mora em `src-go/`:

```
main.go, app.go     exigidos pelo Wails na raiz — não dá pra mover
wails.json           config do Wails (frontend:dir aponta pra "svelte")
build/               ícones e manifesto do instalador (convenção do Wails)
src-go/
  metrics/           coleta (gopsutil) + tipos (Snapshot, Inventory) + Broadcaster
  tray/              menu da bandeja, chamando callbacks do app.go
  screen/            área útil do monitor (SystemParametersInfoW), pra posicionar as janelas
  assets/            ícone da bandeja embutido no binário (.ico)
  cmd/icongen/       ferramenta de build (não roda em produção): SVG → .ico
svelte/              frontend (Svelte 5 + Vite), ver REAPROVEITAMENTO.md
icons/               SVGs de origem e o .ico gerado — a cópia "de referência"
docs/                este diretório
```

`src-go/metrics`, `src-go/tray` e `src-go/assets` **não** se chamam `internal/` — essa é uma
diferença proposital em relação à primeira versão. O Go proíbe qualquer código fora da árvore
`src-go/` de importar um pacote `src-go/internal/algumacoisa` (é a regra de visibilidade do
`internal/`), e `main.go`/`app.go` moram fora dessa árvore (na raiz, por exigência do Wails) —
então usar `internal/` ali dentro travaria a própria compilação. Como nada fora deste módulo
importa este código de qualquer forma (é um binário, não uma lib publicada), a palavra `internal`
não protegia nada de verdade; tirá-la resolve o problema de import sem perder nada.

`src-go/assets` existe pela mesma razão da primeira versão: `//go:embed` não alcança fora da
árvore do arquivo `.go` (sem `..` no caminho), e o ícone de origem mora em `/icons`. `svelte/`
não tem esse problema — o `//go:embed all:svelte/dist` em `main.go` aponta direto pro build do
Vite.

## Segurança e escopo desta fase

- Nenhum dado sai da máquina. Não há cliente HTTP de saída, não há token, não há telemetria — e,
  diferente da primeira versão, agora nem existe mais uma porta TCP aberta: a comunicação
  Go↔Svelte é só IPC do Wails dentro do próprio processo.
- O agente roda em primeiro plano (minimizado na bandeja); não há instalação como serviço do
  Windows nesta fase — ver `ROADMAP.md`.
