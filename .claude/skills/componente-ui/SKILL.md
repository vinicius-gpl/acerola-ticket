---
name: componente-ui
description: Cria ou altera um componente de tela (primitivo ou compositor) no padrão do projeto — props em data/ui/state/actions, função pura sem hook de dado, story cobrindo variantes e estados, teste feliz e triste. Use quando for preciso um componente visual novo ("um cartão de cliente", "um seletor de data", "um gráfico"), mudar a aparência de um existente ou adicionar um componente do shadcn.
---

# Componente de UI

Leia também `ui-padrao` (visual e texto).

## 1. Já existe?

Antes de criar, procure em `client/src/lib/components/`. Cada componente mora na própria pasta
(`<nome-kebab>/<nome-kebab>.svelte`) — não há mais divisão entre primitivo e compositor, é uma
pasta achatada só. Catálogo atual:

| Componente | Para |
|---|---|
| `ActionButton` | Todo botão de ação (variantes primary/secondary/ghost/danger, ícone, carregando) |
| `SubmitButton` | O botão que envia formulário |
| `TextField` / `TextAreaField` / `SelectField` | Campos com rótulo e erro colados |
| `StatusBadge` | Selo de situação (o tom vem do domínio) |
| `StatCard` + `StatCardGrid` | Número grande de painel |
| `ProgressBar` | Andamento |
| `PersonAvatar` | Iniciais / foto |
| `DonutChart` / `ColumnChart` | Gráficos (clique vira filtro) |
| `PageHeader` | Topo de toda tela |
| `EmptyState` / `ErrorState` | Vazio e erro |
| `AppShell` | A casca com menu (não mexa sem motivo) |
| `ConfirmDialog` | Confirmar o que não tem volta |
| `TaskListView` / `TaskFormDialog` | Moldes de tela de lista e formulário |

Dá para resolver com `ui` ou composição de existentes? Faça isso em vez de criar.

## 2. Genérico ou de domínio?

Não há mais pasta separada — a diferença agora é só de conhecimento, dentro da mesma
`lib/components/`:

- **Genérico**: indivisível, não conhece entidade do domínio (`ActionButton`, `TextField`).
- **De domínio**: junta componentes genéricos; pode conhecer `Task`, `Customer`
  (`TaskListView`, `TaskFormDialog`).

## 3. Precisa de componente do shadcn?

```bash
cd acerola/dashboard/client
npx shadcn-svelte@latest add <nome>
```

Vai para `lib/components/ui/` (aponta pelo `components.json` da raiz do `client`) — **não edite
o que chegou**. Confira que o `cn` foi importado de `$lib/utils/cn` (se veio de outro lugar,
troque). Depois crie o componente nosso que o envolve, aplicando as variantes com `tv()`
(modelo: `action-button.svelte`). Fora de `lib/ui/`... na prática, fora do próprio
`lib/components/`, ninguém importa `lib/components/ui/` direto.

## 4. Escrever — `<nome-kebab>/<nome-kebab>.svelte`

- Comentário no topo: **o que é e por que é assim** (a decisão, não a descrição do markup).
- Bloco `<script lang="ts" module>` para o que é estático (variantes com `tv()`, tipo de props);
  bloco `<script lang="ts">` para a instância, com `let { data, ui, state, actions }: <Nome>Props = $props();`
  (+ `children` na raiz quando compõe, via `Snippet`).
- `export type <Nome>Props = { data; ui?; state?; actions? }` no bloco `module`.
- **Zero** `createQuery`, `createMutation`, navegação imperativa de rota dentro do componente.
  Permitido: `$state` puramente visual (mostrar/esconder senha), `$derived` para computar a
  partir das props, `bind:` de DOM.
- Early return (`{#if}` cedo) para vazio/carregando/erro. Padrões (`??`, `?.`) em funções
  `resolve*` no bloco `module` se a complexidade passar de 10.
- Classes com `cn()`; cores por token (`text-ink-700`, `bg-brand-blue-800`, `text-destructive`).
- Acessibilidade: rótulo ligado ao campo (`for`/`useId` equivalente do Svelte), `aria-invalid` +
  `aria-describedby` no erro, `role="alert"` em falha, `aria-label` em botão só de ícone,
  `aria-hidden` em ícone decorativo, `type="button"` em botão que não envia.

## 5. Story — `<nome-kebab>.stories.svelte`

`title: 'Components/<Nome>'`. No mínimo: `Default`, todas as variantes de `ui`, cada estado
(carregando, desabilitado, erro, vazio), e um **caso limite** (texto longo em coluna estreita,
um item só). Callbacks com `fn()` de `storybook/test`. Texto de exemplo inventado, em português.
Não nomeie story de `Error` (sombra o global) — use `LoadFailed`.

## 6. Teste — `<nome-kebab>.test.ts`

`describe('<Nome>')` e `it(...)` em inglês; `// feliz` e `// triste`. Consulte por papel e
rótulo (`getByRole('button', { name: 'Salvar' })`), como a pessoa enxerga. Teste: o que
aparece, o callback chamado com o valor certo, o estado travado, o erro anunciado. Quando o
componente precisa de um contexto Svelte pra montar (provider, slot), use um arquivo auxiliar
`<nome-kebab>-harness.test.svelte` do lado (veja `app-shell-nav-entry` como modelo).

## 7. Verificar

```bash
cd acerola/dashboard
npx vitest run --root client src/lib/components/<pasta>
npm run lint -w client
npm run typecheck -w client
```

Para ver: `npm run storybook` → http://localhost:6006.
