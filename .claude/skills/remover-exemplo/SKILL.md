---
name: remover-exemplo
description: Remove a feature de exemplo de Tarefas (tasks) por inteiro — contrato, tabela e migration, módulo da API, seed, telas, rota e menu — deixando o projeto compilando e com os testes verdes. Use quando a pessoa pede para tirar o exemplo, "limpar o template" ou quando o MVP já tem a primeira feature própria.
---

# Remover o exemplo de Tarefas

**Leia antes:** a feature de Tarefas é o molde que as outras skills citam. Se o MVP ainda não
tem nenhuma feature própria, pergunte se a pessoa quer mesmo remover agora — sem ela, a próxima
feature é construída só pelo CONTRIBUTING.

Crie uma branch: `feature/remove-tasks-example` (`git-fluxo`).

## 1. Apagar

Relativo a `template/`:

```
shared/src/domain/task-status.util.ts (+ .test.ts)
shared/src/schemas/task.schema.ts (+ .test.ts)
server/src/lib/db/schema/tasks.schema.ts
server/src/modules/tasks/                       (pasta inteira)
server/test/tasks.e2e.ts
scripts/seed/tasks/                             (pasta inteira)
client/src/lib/api/tasks.api.ts
client/src/lib/view-models/use-task-list.model.ts (+ .test.tsx)
client/src/lib/view-models/use-task-form.model.ts (+ .test.tsx)
client/src/lib/ui/composers/task-list-view.* (component, stories, test)
client/src/lib/ui/composers/task-form-dialog.* (component, stories, test)
client/src/routes/tasks/                        (pasta inteira)
client/e2e/tasks.e2e.ts
```

**Não apague** os primitivos, `ConfirmDialog`, `AppShell` nem nada de `lib/` genérico.

## 2. Desligar as referências

- `server/src/app.module.ts` — tirar `TasksModule`.
- `server/src/lib/db/drizzle-schema.ts` — tirar `tasks`.
- `server/src/lib/db/db-error.util.ts` — tirar `tasks_status_valid` de `CHECK_MESSAGES`.
- `server/src/lib/db/db-error.util.test.ts` — o teste de check usa `tasks_status_valid`: troque
  por um nome genérico e ajuste a expectativa para a mensagem padrão.
- `server/src/lib/db/open-database.util.test.ts` — os testes inserem em `tasks`. Mantenha o
  de `foreign_keys` e o de `resolveDatabaseFile`; troque o de migration por um que confira que
  `openDatabase(':memory:')` abre sem erro (ou use a tabela da feature nova).
- `scripts/seed/seed-all.ts` — tirar `seedTasks` e o `report`.
- `template/package.json` — tirar `seed:tasks`.
- `client/src/lib/ui/navigation.ts` — tirar o item `tasks`.
- `client/src/routes/index.tsx` — redirecionar para a tela principal nova (ou mostrar um
  `EmptyState` de boas-vindas se ainda não houver nenhuma).
- `client/src/lib/utils/chart-slice.util.ts` — `CATEGORY_COLORS` tem os rótulos de tarefa;
  esvazie ou troque pelos da feature nova (e ajuste o teste).
- `server/src/lib/auth` e `lib/policy` não mudam.

## 3. A tabela no banco

Gere a migration que remove a tabela:

```bash
npm run build -w @template/shared
npm run db:generate
```

Confira que o SQL é um `DROP TABLE \`tasks\``. **Não apague** a migration `0000_*` — ela já
pode estar aplicada em outras máquinas.

## 4. Documentação

- `README.md` — tirar o parágrafo que apresenta Tarefas.
- `CLAUDE.md` e `.claude/skills/` citam Tarefas como molde, mas são **protegidos**: não edite.
  Diga à pessoa que as instruções do Claude ainda mencionam o exemplo, e que o suporte ajusta
  quando for conveniente — nada deixa de funcionar por isso. Enquanto isso, o molde passa a ser
  a primeira feature real do MVP.

## 5. Verificar e commitar

Skill `verificar` inteira. Depois `git-commit`, um commit por local
(`[refactor](contracts): Remove o exemplo de tarefas`, idem `db`, `backend`, `web`, `docs`), e
`git-fluxo` Fases 3 e 4 — com o OK da pessoa antes de juntar na develop.
