---
name: banco-de-dados
description: Cria ou muda tabelas do Postgres (Neon) com Drizzle — arquivo de schema, registro, geração e revisão da migration, mensagens de erro do banco, recriar o banco e olhar os dados. Use quando a pessoa pede um campo novo, uma tabela nova, relação entre cadastros, "apaga o banco", "zera os dados", "quero ver o que está no banco", ou aparece erro de tabela/coluna inexistente.
---

# Banco de dados (Postgres + Drizzle)

Caminhos relativos a `acerola/dashboard/`.

## Como funciona (explique assim para a pessoa, se ela perguntar)

- O banco é o **Postgres da Neon**. A conexão fica em `DATABASE_URL`, no `server/.env` (nunca
  vai para o git) — sem ela o server recusa subir e diz qual variável falta.
- As **tabelas são escritas em TypeScript** (`server/src/lib/db/schema/`).
- Cada mudança de tabela gera uma **migration** (`server/drizzle/`) — um arquivo SQL que leva o
  banco de uma versão para a próxima. Essa vai para o git, e é aplicada **sozinha** quando o
  server sobe ou um seed roda.

## Tabelas que NÃO se criam

Usuários, sessões, contas, senhas, tokens, logins: identidade é do auth-forward (skill
`limites-do-mvp`). O arquivo é bloqueado pelo hook.

## Criar tabela

1. `server/src/lib/db/schema/<entities>.schema.ts` (modelo: `tasks.schema.ts`):
   - `pgTable('<entities>', {...}, (table) => [índices, checks])`
   - `id: serial('id').primaryKey()`
   - colunas em **snake_case** no banco, camelCase no TS: `createdAt: timestamp('created_at', ...)`
   - datas: `timestamp('x', { withTimezone: true, mode: 'date' })`; default de agora: `.defaultNow()`
     — o Postgres guarda o instante em UTC e converte na leitura, então a mesma linha lida de
     fusos diferentes continua sendo o mesmo momento (o SQLite não tinha isso: lá a data era um
     inteiro em milissegundos, por falta de tipo)
   - booleano: `boolean('x')`
   - dinheiro: `integer` em **centavos** (nunca `real`/`numeric` de ponto flutuante)
   - lista fixa: `text('status', { enum: LISTA })` **+** `check('<tabela>_<coluna>_valid', ...)`
   - não pode repetir: `.unique()` ou `uniqueIndex('<tabela>_<colunas>_unique').on(...)`
   - relação: `integer('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' })`
     — `cascade` só quando apagar o pai deve apagar os filhos, e aí só `admin` exclui.
   - autoria: `createdBy`, `updatedBy` (texto, e-mail) e `createdAt`, `updatedAt`
   - exporte `export type <Entity>Row = typeof x.$inferSelect;` e `<Entity>Insert`
2. Registre em `server/src/lib/db/drizzle-schema.ts`.
3. Gere a migration (passo "Gerar").

## Mudar tabela

Edite o arquivo de schema e gere a migration. Cuidados que o Postgres impõe:

- **Coluna nova `notNull` em tabela com dados** precisa de `.default(...)` — senão a migration
  falha nas máquinas que já têm dados.
- Renomear coluna: o `drizzle-kit` pergunta se é renomear ou apagar+criar. **Escolha renomear**,
  ou os dados daquela coluna somem.
- Mudar tipo ou restrição: o Drizzle recria a tabela copiando os dados. Leia o SQL.

## Gerar

```bash
npm run build -w @template/shared   # o schema lê listas do shared
npm run db:generate
```

**Leia o `.sql` gerado** e confirme que ele faz só o que você pretendia (nenhum `DROP` inesperado).
Se o nome gerado for aleatório, tudo bem.

Regras:
- **Nunca edite** migration que já foi commitada, nem `server/drizzle/meta/`. Errou? Gere uma
  nova que corrige.
- Migration ainda **não** commitada e errada: apague o `.sql` **e** a entrada correspondente em
  `meta/_journal.json` e o snapshot — ou, mais simples, `git checkout -- server/drizzle` e
  gere de novo.

## Erros do banco na tela

Constraint nova? Dê a ela uma mensagem em português em `server/src/lib/db/db-error.util.ts`:

- `unique` → `CONFLICT_MESSAGES['<tabela>.<coluna>']`
- `check` → `CHECK_MESSAGES['<nome_do_check>']`

Com teste em `db-error.util.test.ts` se a tradução tiver lógica nova.

## Aplicar e conferir

- Com o server rodando em modo `dev`, ele reinicia e aplica sozinho.
- Sem server: `npm run db:migrate`, ou `npm run seed:all` (que também aplica).
- Olhar os dados: `npm run db:studio` (abre o Drizzle Studio no navegador) ou o painel da Neon
  (Tables, no projeto do banco).

## Banco com erro grave

Migration commitada que não aplica, histórico de migrations em conflito sem saída, ou o Postgres
da Neon fora do ar: **não tente consertar direto no painel da Neon** → skill `suporte`.

## Recriar do zero — PEÇA CONFIRMAÇÃO ANTES

```bash
npm run db:reset
```

**Apaga todos os dados** do banco (a mesma Neon que todo mundo do projeto usa) e recria com os
seeds. Diga isso com essas palavras e só rode com um "sim" explícito.

## Verificar

```bash
npm test -w server
npm run test:e2e -w server
```

O `test:e2e -w server` sobe contra o banco de `TEST_DATABASE_URL` (uma branch separada do banco
na Neon) e aplica todas as migrations nele — se uma migration estiver quebrada, é ele que acusa.
Sem essa variável no `.env`, os testes E2E são pulados (não falham).

## Commit

Local `db`: `[feat](db): Tabela de clientes com telefone único`.
