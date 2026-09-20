---
name: dados-de-teste
description: Cria ou altera os dados de teste (seeds) — uma pasta por entidade em scripts/seed, dados inventados e versionados, ids fixos para rodar quantas vezes quiser, casos limite e ordem de dependência. Use quando a pessoa pede "dados de exemplo", "popula o banco", "quero ver a tela cheia", "cria uns 50 clientes de teste", ou quando uma feature nova precisa de dados para ser vista.
---

# Dados de teste (seeds)

Caminhos relativos a `acerola/dashboard/`. Modelo: `scripts/seed/tasks/`.

## Estrutura

```
scripts/seed/
├── seed.util.ts              # não mexer: abre o banco, recusa produção, imprime
├── seed-all.ts               # a lista, NA ORDEM de dependência
└── <entities>/
    ├── <entities>.data.ts    # OS DADOS — versionados
    └── seed-<entities>.ts    # como gravar
```

## Criar os dados — `<entities>.data.ts`

```ts
import { type CustomerInsert } from '../../../server/src/lib/db/schema/customers.schema';

const SEED_AUTHOR = 'seed@template.local';

export const CUSTOMERS_SEED: CustomerInsert[] = [
  { id: 1, name: 'Padaria Pão Quente', city: 'Goiânia', createdBy: SEED_AUTHOR },
  // ...
];
```

Regras:

- **`id` fixo em todo registro.** É o que torna o seed idempotente.
- **Dado INVENTADO.** Nada de nome, CPF, CNPJ, telefone ou e-mail de pessoa/empresa real — o
  arquivo fica no histórico do git para sempre. Use nomes plausíveis e obviamente fictícios,
  telefones `(62) 90000-0001`, e-mails `@exemplo.com`.
- **Cubra os estados da tela:** cada situação possível, campo opcional vazio, texto enorme,
  valor zero, registro inativo. O seed é o que faz a tela ser vista em todos os estados.
- **Volume:** 5 a 30 registros por padrão. Se a pessoa pedir muitos ("200 clientes"), gere com
  `Array.from` e dados determinísticos (índice), nunca `Math.random` — o mesmo seed tem que dar
  o mesmo resultado em toda máquina.
- **Relações:** use os ids fixos da entidade referenciada (`customerId: 1`).
- Datas: `new Date('2026-01-15T12:00:00.000Z')` explícitas quando importam.

## Gravar — `seed-<entities>.ts`

Copie `seed-tasks.ts` e troque tabela/dados. O `onConflictDoUpdate` lista **todas** as colunas
editáveis com `sql\`excluded.<coluna_no_banco>\`` e zera `updatedAt/updatedBy`.

## Registrar — `seed-all.ts`

Importe e chame **depois** de toda entidade que ela referencia:

```ts
report('clientes', await seedCustomers(db));
report('pedidos', await seedOrders(db));   // pedido aponta para cliente
```

E um script individual em `acerola/dashboard/package.json`, no padrão de `seed:tasks`:

```json
"seed:customers": "npm run build -w @template/shared && tsx scripts/seed/customers/seed-customers.ts"
```

## Rodar

```bash
npm run seed:all          # grava por cima (pode rodar com o server no ar)
npm run seed:<entities>   # só uma entidade
```

Precisa começar do zero? `npm run db:reset` — **apaga tudo**: peça confirmação (ver
`banco-de-dados`).

## Verificar

```bash
npm run typecheck        # inclui scripts/
npm run seed:all         # duas vezes: a contagem não pode dobrar
```

## Commit

Local `db`: `[feat](db): Dados de teste de clientes com cidades e situações variadas`.
