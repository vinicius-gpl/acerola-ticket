---
name: nova-feature
description: Constrói uma funcionalidade inteira de ponta a ponta no padrão do projeto — contrato Zod em shared, tabela Drizzle/SQLite e migration, módulo NestJS com policy e Swagger, seed, API client, view-model, telas com stories, rota, menu e testes. Use quando a pessoa pede para cadastrar, listar, editar ou acompanhar alguma coisa nova ("quero cadastrar clientes", "preciso de uma tela de pedidos").
---

# Nova feature

**O molde é a feature de Tarefas.** Para cada passo, abra o arquivo equivalente de `task`/`tasks`
e siga a mesma forma: nomes, comentários (o porquê, em português), estados, testes. Se o exemplo
já foi removido, siga o CONTRIBUTING.

Nos caminhos abaixo, `<entity>` é o nome em inglês, singular, kebab-case (`customer`), e
`<entities>` o plural (`customers`). Tudo relativo a `template/`.

## 0. Entender e confirmar (antes de qualquer código)

**O pedido envolve login, usuários, senha, "cada um vê só o seu" ou dados compartilhados entre
computadores?** Essa parte não é feita aqui → skill `limites-do-mvp`. Siga com o resto do
pedido, se houver.

Traduza o pedido e confirme com a pessoa em 3 a 5 linhas:

- **O que ela vai conseguir fazer** ("cadastrar clientes, ver a lista filtrando por cidade,
  editar e excluir").
- **Campos**, com o que é obrigatório e os limites óbvios (nome obrigatório, até 120 letras).
- **Quem pode o quê** — padrão: todos veem; `admin` e `editor` criam e editam; só `admin` exclui.
- **Onde aparece no menu.**

Decida sozinho o que é técnico (tipos, índices, nomes). Pergunte só o que muda o resultado
para ela. Depois do OK do entendimento, **crie a branch antes de qualquer código**
(`git-fluxo`, Fase 1): `feature/<entities>`.

## 1. Contrato — `shared/`

- `shared/src/domain/<entity>-*.util.ts` — só se houver regra pura (listas de situação, cálculo).
  Com teste `.test.ts`.
- `shared/src/schemas/<entity>.schema.ts`:
  - `<entity>Schema` (o que a API devolve; datas como `z.string().datetime()`)
  - `create<Entity>Schema`, `update<Entity>Schema` (todo campo `.optional()`, nulável quando
    pode ser limpo), `<entity>ListQuerySchema` (estende `paginationQuerySchema`)
  - `<entity>FormSchema` — a forma do formulário (texto sempre `string`, vazio é `""`),
    reaproveitando as mesmas regras e mensagens
  - **Mensagens em português** — são texto de tela. Autoria (`createdBy`) **não** entra.
- `shared/src/schemas/<entity>.schema.test.ts` — feliz e triste.

## 2. Banco — siga a skill `banco-de-dados`

- `server/src/lib/db/schema/<entities>.schema.ts`: `id` autoincremento, colunas em snake_case,
  datas `integer({ mode: 'timestamp_ms' })`, `createdAt/createdBy/updatedAt/updatedBy`,
  índices do que é filtrado, `check` para listas fixas, `unique` para o que não pode repetir,
  `references(..., { onDelete })` para relação.
- Registrar em `server/src/lib/db/drizzle-schema.ts`.
- `npm run build -w @template/shared && npm run db:generate` e **ler o SQL gerado**.
- Mensagens de conflito/check novas em `server/src/lib/db/db-error.util.ts`.

## 3. API — `server/src/modules/<entities>/`

```
<entities>.module.ts            → registrar em server/src/app.module.ts
dto/<entity>.dto.ts             → createZodDto dos schemas do shared
repository/<entities>.repository.ts   → consultas; tudo via runQuery/runMaybe; sem regra
mapper/<entities>.mapper.ts (+ .test.ts)   → linha ↔ contrato; carimba autoria; update parcial com setIfDefined
service/<entities>.service.ts (+ .test.ts) → assertCanRead/Edit/Delete no início de cada método; 404 com mensagem útil
controller/<entities>.controller.ts   → @ApiTags, @ApiOperation, @Api*Response, @Roles, @CurrentUser
```

Testes do service: repository fingido com `vi.fn()`, incluindo **viewer recusado sem tocar o
repository** e **404 sem gravar**. Acrescente cenários em `server/test/` (E2E) se houver regra de
banco (unique, check, relação).

## 4. Dados de teste — siga a skill `dados-de-teste`

`scripts/seed/<entities>/` com dados inventados, ids fixos, casos limite, e registrar em
`seed-all.ts` na ordem certa.

## 5. Tela — `client/src/`

- `lib/api/<entities>.api.ts` — uma função por endpoint.
- `lib/view-models/use-<entity>-list.model.ts` (+ `.test.tsx`) — query, filtros, mutations
  simples, exclusão com confirmação. `data`/`state` em funções `build*` se passar da
  complexidade. Estados obrigatórios: `isLoading`, `isEmpty`, `isFilteredOut`, `isTruncated`,
  `error`.
- `lib/view-models/use-<entity>-form.model.ts` (+ `.test.tsx`) — TanStack Form com
  `validators: { onChange: <entity>FormSchema }` (**só `onChange`**: com `onSubmit` o erro fica
  preso) e `mutate` (não `await mutateAsync`).
- `lib/ui/composers/<entity>-list-view.component.tsx`, `<entity>-form-dialog.component.tsx` —
  cada um com `.stories.tsx` e `.test.tsx`. Siga `ui-padrao` e `componente-ui`: `PageHeader`,
  `EmptyState`, `ErrorState`, `ConfirmDialog`, `ActionButton`, `TextField`…
- `routes/<entities>/index.tsx` — só composição (modelo: `routes/tasks/index.tsx`).
- `lib/ui/navigation.ts` — uma linha no menu, ícone Lucide.

## 6. Commits — skill `git-commit`

Na branch da feature, um por local, nesta ordem: `contracts` → `db` → `backend` → `web`. Ex.:
`[feat](contracts): Contrato de clientes com validação de telefone`.

## 7. Terminar — `git-fluxo`, Fases 3 e 4

Trazer a develop, `verificar`, fazer você mesmo o fluxo no navegador (listar, criar com erro
de validação, corrigir, editar, excluir), mostrar à pessoa o passo a passo para conferir e
perguntar **"Está funcionando do jeito que você queria?"**. Merge na develop só com o OK.
