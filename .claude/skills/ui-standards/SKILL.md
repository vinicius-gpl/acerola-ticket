---
name: ui-standards
description: O padrão de UI/UX do projeto — tokens de cor, forma (raio, borda, sombra, altura), quem é responsável por cada coisa, estrutura de toda tela, visão de dados em tabela e cartão com troca automática no celular e tablet, paginação, estados obrigatórios (carregando, erro, vazio, filtrado), texto de tela em português, formulários, confirmação, acessibilidade, movimento e responsivo. Consulte sempre que for desenhar ou revisar uma tela, escrever texto que aparece para o usuário ou quando a pessoa pedir algo "mais bonito" ou "mais claro".
---

# Padrão de UI/UX

Onde cada arquivo mora, prefixo `acerola-*` e o que a rota pode fazer: skill `design-system`.
Como escrever o componente: skill `ui-component`. Os nomes abaixo (`PageHeader`, `ErrorState`…)
são os componentes `acerola-*` correspondentes (`acerola-page-header`, `acerola-error-state`…).

O objetivo não é enfeitar: é que **toda tela pareça o mesmo sistema** e que a pessoa nunca fique
sem saber o que aconteceu.

Tudo que é medida visual vem de `client/src/lib/theme/tokens.css`. **Se o valor não existe como
token, ele não entra no componente** — ou vira token, ou não é usado.

---

## 1. Responsabilidade — quem decide o quê

| Decisão | Dono | Nunca |
|---|---|---|
| Cor, raio, borda, sombra, altura, tipografia | **token** (`tokens.css`) | hex, `rounded-[13px]`, `h-[38px]`, `text-[11px]` no componente |
| Variante, estado visual, forma do controle | **componente `acerola-*`** (via `tv()`) | rota escolhendo `rounded-*`/`border-*`/`h-*` de componente |
| Qual componente aparece, em que ordem, espaçamento entre eles | **rota** (`+page.svelte`) | rota com `<button>`, `<input>`, `<table>` estilizados à mão |
| Tabela × cartão, página atual, filtros | **hook** (`use-*`) / preferência global | componente decidindo sozinho pela largura em JS |
| Texto da tela | **componente de feature** (recebe por `data`) ou rota | genérico com texto de domínio fixo |

Pediram para mudar cor, espaço ou texto de um componente? **Muda só isso.** Reescrever o
componente é violação (`design-system` I1).

---

## 2. Cores

| Uso | Classe |
|---|---|
| Ação principal, menu | `bg-brand-blue-800` (hover `bg-brand-blue-900`) |
| Acento | `bg-brand-yellow-500` — com parcimônia |
| Texto principal / secundário / apagado | `text-ink-900` / `text-ink-700` / `text-ink-500` (ou `text-foreground` / `text-muted-foreground`) |
| Superfície | `bg-card`; fundo de bloco interno `bg-ink-100` |
| Borda | `border-border` (= `ink-300`) |
| Erro | `text-destructive`, `border-destructive`, `ErrorState` |
| Situação | só via `StatusBadge` com tom: `neutral`, `info`, `success`, `warning`, `danger`, `brand` |

**Proibido no componente:** paleta crua do Tailwind (`text-neutral-400`, `bg-red-50`,
`border-emerald-500`) e hex. Ela não acompanha o tema escuro nem a troca de marca. O check
reprova qualquer ocorrência nova.

Tons de estado, quando não é um `StatusBadge`: `text-success` / `text-warning` / `text-info` /
`text-destructive`; fundo suave sólido com `bg-<tom>-soft`; fundo forte com `bg-<tom>` e texto
`text-primary-foreground`. Barras e medidores usam `bg-chart-1…5`.

Ícones: **Lucide, sempre**; emoji não é ícone. Ícone de 16px (`size-4`) em controle e 14px
(`size-3.5`) em controle `sm`.

---

## 3. Forma

### 3.1 Raio — por papel, nunca por tamanho

O visual da casa é **arredondado e macio**, no padrão do date-picker: campo com raio de 14px,
superfície com 16px. Escolha a classe pelo **papel** da peça, não "no olho":

| Classe | Raio | Papel | Exemplos |
|---|---|---|---|
| `rounded-surface` | 16px | o que pousa sobre o fundo | cartão, cartão de lista, painel, tabela, diálogo, popover, gaveta |
| `rounded-control` | 14px | o que se clica ou digita | input, select, date-picker, combobox, botão, input-group, button-group, pastilha de filtro |
| `rounded-box` | 10px | bloco dentro de uma superfície | aviso inline, área de anexo, bloco de detalhe, balão |
| `rounded-chip` | 8px | miudeza dentro de um bloco | item de menu do popover, quadradinho de ícone, célula de calendário |
| `rounded-full` | — | o que é redondo por natureza | `StatusBadge`, avatar, indicador, switch |
| `rounded-t-3xl` | 24px | gaveta de baixo no celular | só o `ResponsiveDialogContent` em `< sm` |

Regras:

- **Proibido** `rounded`, `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`
  e valor arbitrário em componente próprio. Os da escala de tamanho só existem dentro de `ui/`.
- **Aninhamento:** o filho tem raio **menor** que o pai (`surface` → `box` → `chip`). Cartão
  dentro de cartão não acontece; se acontecer, o de dentro é `box`.
- Elementos agrupados (button-group, input-group) arredondam só as pontas: o grupo é
  `rounded-control`, os do meio `rounded-none` — é o que o button-group do shadcn faz.

### 3.2 Borda

| Onde | Classe | Observação |
|---|---|---|
| Superfície (cartão, tabela, diálogo) | `border border-border` | 1px, sempre presente — superfície sem borda some no tema claro |
| Controle (campo, botão `secondary`) | `border border-border` | no foco, a borda não muda: quem marca é o anel (`ring`) |
| Divisória interna (rodapé do cartão, linha de tabela) | `border-t border-border/60` | mais leve que a borda externa |
| Zona de soltar arquivo, vazio de upload | `border border-dashed border-border` | tracejado **só** aqui |
| Erro de campo | `border-destructive` + `aria-invalid` | |
| Seleção/ativo (pastilha marcada, cartão escolhido) | `border-primary` | |

- **Sempre 1px.** Borda de 2px só no anel de foco (já vem de `tokens.css`).
- **Borda colorida só comunica estado** (erro, seleção). Nunca decoração.
- Botão `primary`, `ghost` e `danger` não têm borda; `secondary` tem.

### 3.3 Sombra

| Nível | Classe | Onde |
|---|---|---|
| Repouso | `shadow-xs` | cartão, tabela, campo, painel |
| Flutuante | `shadow-xl` | popover, dropdown, combobox aberto, diálogo |
| Gaveta de baixo | `shadow-2xl` | só o `ResponsiveDialogContent` no celular |
| Nenhuma | — | bloco `box`, item de lista dentro de cartão, botão `ghost` |

Fora disso, não use `shadow`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-2xl` nem sombra colorida.

### 3.4 Altura — a régua `control-*`

Três degraus definidos em `tokens.css`. **O raio é sempre `rounded-control`, à parte.**

| Classe | Altura | Onde |
|---|---|---|
| `control-lg` | 40px (`h-10`) | **todo campo de formulário e de filtro**: texto, data, select, combobox, input-group, pastilha, busca; e o botão que divide fileira com eles |
| `control-md` | 36px | ação da tela: botão do `PageHeader`, rodapé de diálogo, botão de enviar sozinho |
| `control-sm` | 32px | ação **dentro** de outra coisa: linha de tabela, rodapé de cartão, paginação |
| `control-icon-*` | quadrado | botão só de ícone, mesma altura do vizinho |

Regra que decide: **o que divide fileira tem a mesma altura.** Campo de formulário é sempre
`control-lg` — nem mais, nem menos —, aplicado no `acerola-*`, nunca na tela.

### 3.5 Tipografia

| Uso | Classe |
|---|---|
| Título da tela (h1) | `text-xl font-bold text-ink-900` (do `PageHeader`) |
| Título de seção/painel | `text-xs font-semibold uppercase tracking-wider text-muted-foreground` |
| Corpo, célula, valor | `text-sm` |
| Rótulo de campo no cartão, legenda, contagem | `text-xs text-muted-foreground` |
| Número | `tabular-nums` |

**Proibido** `text-[10px]`/`text-[11px]`: menor texto é `text-xs`.
Texto longo quebra (`break-words`); `truncate` só com o valor completo no `title`.

---

## 4. Estrutura de toda tela

```
PageHeader (título h1 + uma linha do que é a tela + ações à direita)
Barra de filtros (busca + selects + TableViewToggle), quando é lista
Aviso de falha de ação (ErrorState inline), quando houver
Corpo (visão de dados)
PaginationBar, quando a lista é paginada
```

Largura: `mx-auto w-full max-w-5xl px-4 sm:px-6`. Espaço entre blocos: `gap-5`; dentro de um
cartão: `gap-3`; padding de superfície: `p-4` (cartão de lista) ou `p-5` (painel).
Uma ação principal por tela (`primary`). As outras são `secondary` ou `ghost`.

---

## 5. O corpo, sempre nesta ordem (early return)

1. **Carregando** → esqueleto com a forma do conteúdo (`Skeleton` com `rounded-surface` no
   bloco de cartão/tabela e `rounded-control` no de campo).
   Nunca "nenhum registro".
2. **Erro** → `ErrorState` com título ("A lista não carregou"), o motivo que veio da API e
   "Tentar de novo".
3. **Vazio de verdade** → `EmptyState` dizendo o que está vazio + o próximo passo + botão de
   criar.
4. **Filtro escondeu tudo** → `EmptyState` "Nenhum X encontrado" + "Limpar filtros".
5. **Conteúdo** → visão de dados (§6) + paginação (§7).

---

## 6. Visão de dados: tabela e cartão

Toda lista com mais de um atributo por item existe **nos dois formatos**: tabela para comparar
colunas, cartão para ler um item por vez. Os dois mostram **os mesmos dados e as mesmas ações**
— o cartão não é uma versão pobre.

### 6.1 Quem aparece

| Largura | Padrão | Com "Ver sempre em cards" ligado |
|---|---|---|
| até 1279px (celular e tablet, `< xl`) | **cartão, sempre** | cartão |
| 1280px ou mais (`xl`) | tabela | cartão |

- A troca para cartão **no celular e no tablet é automática e não tem botão para desfazer**: em
  `< xl` tabela nunca aparece.
- No computador, o `TableViewToggle` (na barra de filtros) escolhe entre tabela e cards: dois
  botões numa moldura, o formato em uso preenchido com a cor principal. Abaixo de `xl` ele some.
  É **preferência do sistema, não da tela**: vale para todas as listas e fica guardada no
  navegador (`acerola-table-view`). Hook: `use-table-view`.
- A troca é **por CSS**, não por JS: os dois blocos são renderizados e um deles fica `hidden`.
  Assim não há pulo de layout na primeira pintura nem diferença entre servidor e navegador.

```svelte
<div class={cn('flex flex-col gap-3', !tableView.forceCards && 'xl:hidden')}
     data-slot="<entity>-cards-mobile"> … </div>

<div class={cn('overflow-x-auto', tableView.forceCards ? 'hidden' : 'hidden xl:block')}
     data-slot="<entity>-table-desktop"> … </div>
```

O par `data-slot` é obrigatório: é por ele que teste e story encontram cada formato.

### 6.2 Anatomia do cartão

```
┌ rounded-surface · border border-border · bg-card · p-4 · shadow-xs ─────────┐
│ CABEÇALHO   identificador/título (font-medium, break-words)   StatusBadge   │
│             linha secundária (text-xs text-muted-foreground)                │
│ CORPO       grid grid-cols-2 gap-3 — cada célula: rótulo (text-xs muted)    │
│             em cima, valor (text-sm) embaixo                                │
│ RODAPÉ      border-t border-border/60 · pt-3 · contagem à esquerda,         │
│             ações control-sm à direita                                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Cabeçalho tem **as 2-3 informações que identificam o item**: identificador, título, situação
  (`StatusBadge`) e responsável.
- Corpo tem o resto, **cada valor com rótulo** — o cartão não tem cabeçalho de coluna para
  explicar o número solto.
- Ações sempre visíveis no rodapé (no toque não existe hover). Ação destrutiva por último.
- **Hover do cartão**: a cor suave da situação do item entra por onde o mouse entrou — classe
  `hover-fill` + `use:fillFromPointer` + `style:--fill-color={fillColorOf(<tom>)}`
  (`lib/motion/hover-fill.ts`). Item sem situação usa `'neutral'`. **Só em cartão**: em linha de
  tabela a camada estica a área de rolagem (a `<tr>` não corta o que sai dela).
- Lista de cartões: a utilidade `card-grid` (`tokens.css`) — de 1 a 4 cartões por linha,
  conforme o ESPAÇO QUE A LISTA TEM (celular 1, tablet 2–3, monitor 3–4; dentro de um diálogo,
  menos). Nunca `flex flex-col` (vira um cartão gigante por linha no monitor) nem
  `grid-cols-N` fixo.

### 6.3 Anatomia da tabela

- Contêiner: o `acerola-table` já entrega `rounded-surface border bg-card shadow-xs overflow-hidden`;
  envolva em `overflow-x-auto` e dê `min-w-[…]` à tabela para a **caixa** rolar, não a página.
- Cabeçalho: `text-xs font-medium text-muted-foreground`; cada coluna com `min-w-*` fixo.
- Primeira coluna = identificador, em `font-medium`, com linha secundária `text-xs` embaixo.
- Coluna de ações por último, `text-right`, cabeçalho `sr-only` "Ações", botões `control-sm`
  ou `control-icon-sm` `ghost` com `aria-label`.
- Linha: `border-b border-border/60` e hover já vêm do `acerola-table-row`. Sem zebra.
- Rodapé (snippet `footer` do `Table`): fonte do dado à esquerda, contagem à direita.

### 6.4 Componente

As 12 listas de hoje repetem o par cartão/tabela à mão (já com o mesmo raio,
`rounded-surface`). O alvo é um genérico
`acerola-data-view` que recebe `data.items`, um snippet `card(item)` e um snippet `row(item)` +
`columns`, e cuida sozinho de `data-slot`, troca por largura, preferência e contêiner.
Lista nova usa ele; lista antiga migra quando for tocada.

---

## 7. Paginação

`PaginationBar` (`acerola-pagination-bar`), **embaixo da visão de dados**, servindo tabela e
cartão ao mesmo tempo (trocar de formato não muda de página).

| Situação | Regra |
|---|---|
| Lista vinda da API | paginação no servidor; tamanho padrão **25** |
| Seção dentro de um painel (orçamento, recomendações) | paginação local; tamanho **5** |
| Total ≤ tamanho da página | a barra mostra só "7 chamados", sem botões |
| Página fora do alcance (filtro reduziu o total) | o hook volta para a última página válida |

- A barra diz **o total** ("26–50 de 312 chamados"), onde a pessoa está ("Página 2 de 13") e
  como andar (Anterior/Próxima). Não tem lista de números.
- Botão na ponta fica **desabilitado**, não some — a barra não pula de lugar.
- Mudar filtro volta para a página 1. Mudar de página rola para o topo da lista.
- Página atual e tamanho moram no **hook**; o componente só recebe `data.page/pageSize/total`
  e devolve `actions.onPageChange`.
- Enquanto carrega a próxima página, a lista atual continua na tela (`state.isLoading` trava os
  botões); não volta para esqueleto.
- Lista **sem** paginação que pode crescer é defeito: mostre a contagem e avise se foi cortada.

---

## 8. Formulário

- Em modal (`Dialog`, `rounded-surface`) para cadastro curto; em tela própria se tiver mais de
  ~8 campos. No celular o diálogo vira gaveta de baixo (`ResponsiveDialogContent`).
- **Todo campo é `control-lg` (40px) + `rounded-control`**, vindo do `acerola-*`. Textarea usa
  `min-h-24` e o mesmo raio.
- Rótulo acima do campo (`text-sm font-medium`), **erro colado embaixo do campo**
  (`text-xs text-destructive`) — nunca só um resumo no topo.
- Erro aparece depois que a pessoa **sai do campo** ou **tenta enviar** — nunca na primeira letra.
- Enter envia (`<form onSubmit>`). O botão de enviar trava e diz "Salvando…".
- Recusa do servidor aparece **dentro** do formulário, que **continua aberto** com o que foi
  digitado.
- Primeiro campo com foco automático.
- Grade: uma coluna no celular; `sm:grid-cols-2` para campos curtos lado a lado.
- Rodapé do diálogo: `Cancelar` (`secondary`) à esquerda do principal, os dois `control-md`.

---

## 9. Texto de tela

- **Português do Brasil**, frase curta, sem jargão técnico. "Não consegui salvar" em vez de
  "Erro 500".
- **Botão diz o verbo**: "Criar cliente", "Salvar", "Excluir pedido". Nunca "OK", "Sim",
  "Enviar dados".
- **Erro diz o motivo e o que fazer**: "Informe o telefone", "Esse e-mail já está cadastrado.
  Abra o cadastro existente em vez de criar outro."
- **Vazio diz o próximo passo**: "Nenhum cliente ainda. Cadastre o primeiro para começar."
- Títulos em sentença ("Novo cliente"), não Title Case.
- Plural certo: "1 computador" / "3 computadores" — nunca "computador(es)".
- Datas por `formatDate`/`formatDateTime` (`lib/utils/format-date.ts`) → `14/09/2026`.
- Números com `toLocaleString('pt-BR')`. Dinheiro por `lib/utils/format-money.ts`.

---

## 10. Ações destrutivas

Excluir, arquivar, enviar sem volta → `ConfirmDialog` com título em pergunta ("Excluir este
cliente?"), descrição com o nome do registro e "Não dá para desfazer.", botão `danger` com o
verbo. Enquanto confirma, nada fecha.

---

## 11. Acessibilidade (não é opcional)

- Tudo operável no teclado; foco sempre visível (anel de `tokens.css`).
- Campo com rótulo ligado; erro com `aria-invalid`/`aria-describedby`; falha com `role="alert"`.
- Botão só de ícone tem `aria-label`. Ícone decorativo tem `aria-hidden`.
- Alvo de toque mínimo 32px (`control-sm`); no cartão, ações não dependem de hover.
- Contraste: texto sobre azul é branco; nunca `text-ink-500` sobre `bg-ink-100` em informação
  importante.

---

## 12. Movimento

Só pelas funções de `lib/motion/motion.ts` (`fadeInUp`, `staggerIn`, `countTo`…): curtas
(< 350ms) e **desligadas** quando o sistema operacional pede menos movimento. Animação explica o
que mudou de lugar; não é enfeite. Popover/combobox abrem com a animação do próprio componente.

**Nível de efeitos** (`lib/hooks/use-effects`): o sistema marca o `<html>` com
`data-effects="full"` ou `"lite"` — pelo que a máquina aguenta (sem aceleração de vídeo ou
máquina modesta abre em `lite`; animação medindo abaixo de 30 quadros por segundo rebaixa
sozinha) ou pelo que a pessoa escolheu no botão **Efeitos** do menu. Efeito visual novo tem de
ter a versão `lite` (o mesmo resultado, sem a animação) e só animar `transform`/`opacity`.

---

## 13. Responsivo

Tudo funciona em **400px** de largura (toda lista tem story em 400px): filtros empilham
(`flex-col sm:flex-row`), ações do `PageHeader` descem, grade de `StatCard` vira uma coluna,
lista vira cartão (§6).

| Largura | Barra lateral | Visão de dados |
|---|---|---|
| até 1023px (celular e tablet em pé) | gaveta, por cima | cartão |
| 1024px a 1279px (tablet deitado) | fixa, 256px | cartão |
| 1280px ou mais (computador) | fixa, 256px | tabela (ou cartão, se preferido) |

**Nada rola para o lado, nunca.**

- **Pastilha de escolha quebra linha, não vira tira rolante.** Grupo de opções usa `flex-wrap`;
  nunca `overflow-x-auto`. Com mais de 4 opções num espaço estreito (cabeçalho, menu), use
  `SelectField` em vez de pastilhas.
- **Quem rola é a caixa da tabela, não a página.** A área de conteúdo tem `min-w-0` (no
  `SidebarInset` do `app-shell`); sem isso o `overflow-x-auto` da tabela não funciona.
- **Texto quebra, não corta.** `break-words` em nome, e-mail e descrição.
- **A barra lateral não come a largura do tablet.** Corte gaveta/fixa em 1024px (vem do
  `sidebar` do shadcn, `lib/hooks/ui/`); o resto mede largura com `use-media-query` passando o
  breakpoint. Abaixo de `xl` gráfico usa a forma compacta.
- Breakpoint em JS só para o que CSS não resolve (gráfico, gaveta). Troca tabela/cartão é CSS.

---

## 14. Checagem

`npm run check:design` (em `acerola/dashboard`) confere raio, paleta crua, fonte em px, sombra e o
par cartão/tabela, junto com as regras de estrutura — nos dois apps Svelte (dashboard e agent). Só
reprova o que é novo; a dívida está na baseline e só diminui. O mesmo check também roda sozinho,
como hook `PostToolUse`, a cada `Edit`/`Write` do Claude Code — ele avisa na hora se a edição
introduziu uma violação nova. Detalhes: skill `design-system` §11.
