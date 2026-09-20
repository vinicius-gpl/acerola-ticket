# Arquitetura

Agente de monitoramento de sistema para Windows, em Go, com dois jeitos de olhar os dados: um
ícone na bandeja (visão rápida) e um painel web local (visão densa, tipo btop). Esta é a fase de
prova de conceito: tudo roda localmente, nada sai desta máquina. Veja `ROADMAP.md` para o que vem
depois.

## Por que cada peça da stack

**Coleta — `github.com/shirou/gopsutil/v4`.** É a biblioteca padrão de fato para métricas de
sistema em Go, com suporte a Windows via WMI/syscalls nativos e a mesma API em CPU, memória,
disco, rede, processos e informações de host. Evita reimplementar chamadas ao Windows na mão.

**Bandeja — `fyne.io/systray`.** Wrapper fino sobre a API nativa de tray do Windows (mantido,
puro Go + cgo apenas onde o SO exige). Não usamos o Fyne completo (o framework de UI) — só o
pacote `systray`, que é independente.

**Servidor web — `net/http` da stdlib + `github.com/gorilla/websocket`.** Um painel local não
precisa de framework HTTP; a stdlib do Go já tem roteador (`http.ServeMux`), servidor de arquivos
estáticos (`http.FileServerFS`) e tudo o mais. Para o WebSocket, escolhemos **gorilla/websocket**
em vez de `nhooyr.io/websocket` (hoje `coder/websocket`) porque:

- é a biblioteca mais usada e testada em produção para esse caso (broadcast de um servidor para
  N clientes, mensagens de texto simples);
- API mais direta para o nosso uso (`Upgrade`, `ReadMessage`, `WriteMessage`) sem exigir
  `context.Context` em cada chamada;
- a alternativa é mais moderna e um pouco mais enxuta, mas otimiza para casos que não temos aqui
  (streaming binário de alta performance, HTTP/2). Para "empurrar um JSON por segundo para uma
  aba do navegador", a diferença não compensa trocar a biblioteca mais conhecida.

**Front-end do painel — HTML/CSS/JS puro, sem framework, sem build step.** É uma única página que
mostra números que mudam; um framework de componentes (React, Vue…) ou uma lib de gráficos
(Chart.js, D3…) resolveria um problema que não existe aqui. Os gráficos de série temporal são um
`<canvas>` desenhado à mão em `web/app.js` (classe `Sparkline`, ~40 linhas) — o suficiente para
sparklines de CPU/memória/rede/disco sem puxar dependência externa nem passo de build.

**Rasterização de ícone — `github.com/srwiley/oksvg` + `github.com/srwiley/rasterx`.** Só usada
pela ferramenta `cmd/icongen`, não pelo agente em produção — ver `ICONES.md`.

## Como as métricas fluem (evitando uma pegadinha do gopsutil)

`cpu.Percent(0, ...)`, a chamada não-bloqueante de CPU do gopsutil, guarda o "instante da última
chamada" numa variável **global do pacote**. Se a bandeja e o painel web chamassem essa função
cada um no seu próprio timer, eles brigariam por esse estado global e o percentual de CPU sairia
errado para os dois.

A solução foi centralizar a coleta: existe um único `metrics.Broadcaster` (em
`internal/metrics/broadcaster.go`) que roda **um** timer (a cada 1s), chama
`Collector.Snapshot()` uma vez, e distribui o resultado para quem estiver interessado — a bandeja
e cada aba do navegador conectada ao WebSocket. Ninguém mais chama `Collector.Snapshot`
diretamente.

```
Collector (gopsutil)
      │  a cada 1s
      ▼
 Broadcaster.tick() ── guarda "latest" ── Bandeja lê Latest() a cada 2s (só rótulos)
      │
      └── publica em canais ── WebSocketHandler (um por aba) ── navegador (gráficos + tabela)
```

A bandeja usa `Broadcaster.Latest()` (o snapshot mais recente, sem esperar o próximo tick) porque
seu menu atualiza numa cadência mais lenta e não precisa de histórico. O painel web usa
`Broadcaster.Subscribe()` para receber cada snapshot assim que sai, e mantém o histórico de série
temporal no próprio navegador (em memória, no `app.js`) — o servidor não guarda histórico.

## Estrutura de pacotes

```
cmd/agent          entrypoint: monta Collector, Broadcaster, Server e Tray, e bloqueia na Tray
cmd/icongen        ferramenta de build (não roda em produção): SVG → .ico
internal/metrics   coleta (gopsutil) + tipos (Snapshot, Inventory) + Broadcaster
internal/tray      menu da bandeja, lendo do Broadcaster
internal/webserver serve o painel + WebSocket, lendo do Broadcaster
internal/assets    ícone da bandeja embutido no binário (.ico)
web/               HTML/CSS/JS do painel, embutidos no binário via go:embed
icons/             SVGs de origem e o .ico gerado — a cópia "de referência"
docs/              este diretório
```

`internal/assets` existe por uma restrição do Go: `//go:embed` não permite `..` no caminho, só
alcança arquivos dentro da própria árvore de diretórios do arquivo `.go`. Como o ícone de origem
mora em `/icons` (fora de `internal/tray`), mantemos uma cópia de trabalho em
`internal/assets/tray.ico` só para o `embed` alcançar. `/icons` continua sendo a referência
"canônica" e o que a documentação aponta. Já `web/` não tem esse problema — o próprio diretório
tem o `embed.go` junto dos arquivos que embute, sem precisar de cópia.

## Segurança e escopo desta fase

- O servidor HTTP escuta só em `127.0.0.1:8098` — não em `0.0.0.0`. Isso, e não uma verificação de
  `Origin`, é a fronteira real de segurança desta fase: nada fora da máquina alcança o painel.
- Nenhum dado sai da máquina. Não há cliente HTTP de saída, não há token, não há telemetria.
- O agente roda em primeiro plano (ou minimizado na bandeja); não há instalação como serviço do
  Windows nesta fase — ver `ROADMAP.md`.
