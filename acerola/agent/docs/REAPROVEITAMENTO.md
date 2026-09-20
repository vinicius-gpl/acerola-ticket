# Reaproveitamento do projeto de referência

Antes de escrever qualquer componente novo, o frontend em
`acerola-reader/acerola/desktop` (Tauri + SvelteKit, o leitor de quadrinhos) foi lido por
inteiro: `package.json`, `svelte.config.js`, `vite.config.ts`, `components.json`, o tema em
`src/theme/`, e uma amostra de componentes (`acerola-button`, `acerola-card`,
`acerola-mode-picker`) pra entender o padrão antes de copiar qualquer coisa.

## Reaproveitado tal e qual

- **As variáveis CSS do Catppuccin** (`src/theme/colors/catppuccin.css` de lá →
  `svelte/src/theme/catppuccin.css` aqui) — byte a byte a mesma paleta mocha/latte.
- **O bloco `@theme inline`** do `tailwind.css`, que mapeia cada variável de cor pra um token do
  Tailwind v4 (`--color-primary: var(--primary)` etc.) — mesma técnica, mesmos nomes de token.
- **`cn()`** (`clsx` + `tailwind-merge`) e os tipos auxiliares `WithElementRef`,
  `WithoutChild(ren)` — copiados de `lib/utils/cn.utils.ts`, só renomeado pra `cn.ts`. São
  exigidos pelos próprios componentes que o shadcn-svelte gera, então não dava pra reduzir.
- **shadcn-svelte + tailwind-variants**, mesmo estilo (`"nova"`) e mesmo `components.json`
  (aliases `$lib/components`, `$lib/components/ui`, `$lib/utils/cn`). Rodamos o CLI de verdade
  (`npx shadcn-svelte@latest add button card badge`) — os arquivos em
  `svelte/src/lib/components/ui/` são gerados por ele, do mesmo jeito que lá.
- **A organização de componentes em duas camadas**: `ui/<nome>/` é o primitivo cru do
  shadcn-svelte (não se edita — o equivalente ao `lib/vendor/ui/` do `acerola/dashboard`);
  `acerola-<nome>/acerola-<nome>.svelte` é o wrapper do projeto, com props em `data` / `ui` /
  `events`, que é quem os dois modos (popup e dashboard) realmente importam. Cada componente
  wrapper mora na própria pasta, igual ao projeto de referência — nada de arquivo solto em
  `components/`.
- **Prettier como único linter/formatter** do frontend (`prettier-plugin-svelte` +
  `prettier-plugin-tailwindcss`), sem ESLint — é exatamente o que o `package.json` de lá faz
  (`"lint": "prettier --check ."`).
- **Versões das libs compartilhadas**: Svelte 5, TypeScript ~5.6, Tailwind v4,
  `@tailwindcss/vite`, `tailwind-merge`, `@lucide/svelte` — mesmos majors/minors do projeto de
  referência.

## Adaptado (mesma ideia, mecanismo diferente por causa do Tauri → Wails)

| No projeto de referência (Tauri) | Aqui (Wails) | Por quê |
|---|---|---|
| SvelteKit inteiro (`src/routes/`, `adapter-static`, SSR desligado) | Svelte 5 + Vite puro, sem SvelteKit | O app tem só 2 telas (popup e dashboard) trocando de conteúdo na mesma janela — o roteamento de arquivos e o adapter da SvelteKit resolvem um problema (múltiplas rotas versionadas, prerender) que não existe aqui. Ganhar isso custaria a complexidade toda de configurar `adapter-static` dentro do WebView2 do Wails sem necessidade. |
| Router de arquivos da SvelteKit | `svelte-spa-router`, com só 2 rotas (`/popup`, `/dashboard`) | Sem SvelteKit não tem router embutido; `svelte-spa-router` é a alternativa mais leve pra Svelte puro — e era exatamente a alternativa que o pedido original já previa pra esse cenário. |
| `data-tauri-drag-region` (atributo HTML) pra arrastar a janela sem borda | `--wails-draggable: drag` (propriedade CSS) em `[data-drag-region]` | O Wails lê a região arrastável por CSS, não por atributo — mecanismo trocado, mesma finalidade (a janela é `Frameless`, sem barra de título nativa). |
| `@tauri-apps/plugin-store` + `getCurrentWindow().onThemeChanged()`, 4 paletas, 3 modos (claro/escuro/sistema) | `localStorage` puro, 2 paletas fixas (mocha/latte), sem modo "sistema" | O pedido desta fase só previa duas paletas com persistência em localStorage — não precisa da complexidade de um plugin de storage nem de sincronizar com o tema do SO. |
| `@tauri-apps/api` (invoke de comandos Rust) | `EventsOn`/`EventsEmit` do Wails + métodos Go expostos via `Bind` | Troca direta de mecanismo de IPC — mesmo papel (frontend chama o backend nativo), API diferente porque o framework é outro. |

## Não reaproveitado — de propósito

O projeto de referência é um leitor de quadrinhos com equipe, versionamento de múltiplas telas
e um design system publicado; o agente é um utilitário de bandeja com duas telas pequenas. Puxar
o restante do ferramental teria custo (tempo de instalação, tamanho de `node_modules`,
complexidade de build) sem benefício real aqui:

- **Storybook, Stryker (mutação), Playwright e2e, WebdriverIO** — infraestrutura de teste/design
  system pra um app com várias telas e vários contribuidores. Duas telas pequenas não justificam
  4 ferramentas de teste diferentes.
- **Paraglide (i18n)** — o agente já nasce só em português; não há tela pra traduzir.
- **`bits-ui`** — só entra quando um componente shadcn-svelte precisa de primitivo acessível
  complexo por baixo (Dialog, Select, Popover, Command). Botão/card/badge não precisam; se um dia
  a popup ganhar, por exemplo, um seletor, ele traz `bits-ui` junto (o CLI resolve isso sozinho).
- **`gsap`, `@formkit/auto-animate`, `qrcode`, `svelte-sonner`, `mode-watcher`** — específicos de
  telas do leitor (animação de página, QR code de pareamento, notificação toast, sincronização de
  tema com plugin nativo) que não existem aqui.
- **Componentes específicos do leitor** (`acerola-sidebar`, `acerola-bookmark-ribbon`,
  `acerola-remote-library-dialog`, `acerola-peer-picker`, `acerola-command`, etc.) — são telas de
  domínio do leitor de quadrinhos, não fazem sentido fora dele.

## Componente novo, sem equivalente no projeto de referência

`acerola-sparkline` (gráfico de série temporal com uPlot) não existe no leitor — foi criado do
zero pra este projeto, mas segue a mesma convenção de pasta e props (`data`/`ui`) dos demais
componentes portados, pra não destoar do resto.
