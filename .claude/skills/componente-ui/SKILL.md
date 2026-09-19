---
name: componente-ui
description: Cria ou altera um componente de tela (primitivo ou compositor) no padrão do projeto — props em data/ui/state/actions, função pura sem hook de dado, story cobrindo variantes e estados, teste feliz e triste. Use quando for preciso um componente visual novo ("um cartão de cliente", "um seletor de data", "um gráfico"), mudar a aparência de um existente ou adicionar um componente do shadcn.
---

# Componente de UI

Leia também `ui-padrao` (visual e texto).

## 1. Já existe?

Antes de criar, procure em `client/src/lib/ui/primitives/` e `composers/`. Catálogo atual:

| Primitivo | Para |
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

| Compositor | Para |
|---|---|
| `AppShell` | A casca com menu (não mexa sem motivo) |
| `ConfirmDialog` | Confirmar o que não tem volta |
| `TaskListView` / `TaskFormDialog` | Moldes de tela de lista e formulário |

Dá para resolver com `ui` ou composição de existentes? Faça isso em vez de criar.

## 2. Primitivo ou compositor?

- **Primitivo** (`lib/ui/primitives/`): indivisível, genérico, não conhece entidade do domínio.
- **Compositor** (`lib/ui/composers/`): junta primitivos; pode conhecer `Task`, `Customer`.

## 3. Precisa de componente do shadcn?

```bash
cd template/client
npx shadcn@latest add <nome>
```

Vai para `lib/vendor/ui/` — **não edite o que chegou**. Confira que o `cn` foi importado de
`@/lib/utils/cn.util` (se veio `from "cn"`, está errado: troque). Depois crie o primitivo nosso
que o envolve, aplicando as variantes com `tv()` (modelo: `action-button.component.tsx`).
Fora de `lib/ui/`, ninguém importa `vendor`.

## 4. Escrever — `<nome>.component.tsx`

- Comentário no topo: **o que é e por que é assim** (a decisão, não a descrição do JSX).
- `export type <Nome>Props = { data; ui?; state?; actions? }` (+ `children` na raiz quando compõe).
- `export function <Nome>(...)` — export nomeado.
- **Zero** `useQuery`, `useMutation`, `useNavigate`. Permitido: `useId`, `useRef` de DOM,
  `useState` puramente visual.
- Early return para vazio/carregando/erro. Padrões (`??`) em funções `resolve*` se a
  complexidade passar de 10.
- Classes com `cn()`; cores por token (`text-ink-700`, `bg-brand-blue-800`, `text-destructive`).
- Acessibilidade: rótulo ligado ao campo (`htmlFor`/`useId`), `aria-invalid` +
  `aria-describedby` no erro, `role="alert"` em falha, `aria-label` em botão só de ícone,
  `aria-hidden` em ícone decorativo, `type="button"` em botão que não envia.

## 5. Story — `<nome>.stories.tsx`

`title: 'Primitives/<Nome>'` ou `'Composers/<Nome>'`. No mínimo: `Default`, todas as variantes
de `ui`, cada estado (carregando, desabilitado, erro, vazio), e um **caso limite** (texto longo
em coluna estreita, um item só). Callbacks com `fn()` de `storybook/test`. Texto de exemplo
inventado, em português. Não nomeie story de `Error` (sombra o global) — use `LoadFailed`.

## 6. Teste — `<nome>.test.tsx`

`describe('<Nome>')` e `it(...)` em inglês; `// feliz` e `// triste`. Consulte por papel e
rótulo (`getByRole('button', { name: 'Salvar' })`), como a pessoa enxerga. Teste: o que
aparece, o callback chamado com o valor certo, o estado travado, o erro anunciado.
Select do Radix: use `fireEvent.click` para abrir e escolher (o `userEvent` trava no jsdom).

## 7. Verificar

```bash
cd template
npx vitest run --root client src/lib/ui/<pasta>/<nome>
npm run lint -w client
npm run typecheck -w client
```

Para ver: `npm run storybook` → http://localhost:6006.
