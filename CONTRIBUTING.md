# Contribuindo

Este documento não é sobre preferência de estilo. Cada regra aqui ou está ligada a um defeito
real que já custou caro num sistema da casa, ou existe para que a estrutura — e não a
disciplina de quem escreve — impeça o defeito de voltar.

Quando a regra for verificável por máquina, ela é lint, teste ou gate de CI. Quando não for,
ela é revisão de PR.

> **Trabalhando com o Claude?** Você não precisa decorar nada disto. O `CLAUDE.md` manda o
> Claude seguir este documento, e as skills em `.claude/skills/` fazem o passo a passo de cada
> tarefa comum (feature nova, commit, seed, banco). Este arquivo é a referência para quando
> alguém — pessoa ou Claude — tiver dúvida sobre o porquê.

---

## 0. A prioridade

**Código funcional vem primeiro.** Elegância que não roda vale zero. Se a escolha for entre
entregar funcionando com uma abstração a menos e entregar bonito com um risco a mais, entrega
funcionando. As regras abaixo existem para não atrapalhar isso — nenhuma delas justifica travar
uma entrega.

Este é um template de **MVP**: o objetivo é validar uma ideia com gente de verdade usando. O
padrão existe para que o MVP que der certo não precise ser jogado fora para virar produto.

---

## 1. Idioma

A régua é uma só: **o usuário vê, é português. O usuário não vê, é inglês.** Comentário é a
única exceção — ele é português mesmo estando no código.

| O quê | Idioma |
|---|---|
| Nome de variável, função, classe, tipo, arquivo, pasta, branch, tabela, coluna, rota | **Inglês** |
| `console.log`, `Logger`, mensagem de log, nome de métrica | **Inglês** |
| `throw new Error(...)` interno, mensagem de exceção, texto de `assert` | **Inglês** |
| `describe` / `it` de teste, nome de story do Storybook | **Inglês** |
| Comentário no código | **Português (pt-BR)** |
| Texto na tela: rótulo, título, botão, placeholder, `aria-label`, `title`, estado vazio | **Português (pt-BR)** |
| Mensagem de erro **mostrada** ao usuário: toast, validação de Zod, texto de `role="alert"` | **Português (pt-BR)** |
| Mensagem de commit e descrição de PR | **Português (pt-BR)** |
| Documentação (`.md`) | **Português (pt-BR)**, com identificadores técnicos em inglês |

O teste que resolve qualquer dúvida: **esse texto pode aparecer na tela de quem usa o
sistema?** Se pode, é português. Se ele só existe para quem programa — log, stack trace,
nome de teste, chave de objeto —, é inglês.

```ts
// Tarefa concluída não volta a "a fazer" sozinha: reabrir é decisão de pessoa.
export function reopenTask(task: Task): Task {
  // Erro interno: quem lê isso é quem programa, e vai em inglês.
  if (task.status !== 'done') throw new Error('Only a finished task can be reopened');
  // ...
}
```

E o contrário, que é o mesmo erro pelo outro lado — **mensagem de Zod é texto de tela**,
porque é ela que o formulário mostra:

```ts
// ERRADO: a validação aparece embaixo do campo, em português, para quem preenche.
z.string().min(1, 'Title is required');
// CERTO
z.string().min(1, 'Informe o título');
```

Comentário explica **por quê**, nunca **o quê**. `// incrementa o contador` é ruído; `// teto de
200 porque lista sem limite trava a tela` é documentação.

---

## 2. Early return — nunca `if/else` alinhado

Sem exceção. Condição que não se aplica sai da função na hora.

```ts
// ❌ nunca
function getTaskLabel(task: Task): string {
  if (task.isDeleted) {
    return 'Excluída';
  } else {
    if (task.dueAt) {
      if (isLate(task.dueAt)) {
        return 'Atrasada';
      } else {
        return 'No prazo';
      }
    } else {
      return TASK_STATUS_LABELS[task.status];
    }
  }
}

// ✅ sempre
function getTaskLabel(task: Task): string {
  if (task.isDeleted) return 'Excluída';
  if (!task.dueAt) return TASK_STATUS_LABELS[task.status];
  if (isLate(task.dueAt)) return 'Atrasada';

  return 'No prazo';
}
```

Guarda primeiro, caminho feliz por último e sem indentação. Em JSX, o mesmo vale: retorne cedo
para estado de carregamento, erro e vazio, e deixe o corpo principal no nível zero.

**Lint:** `no-else-return`, `complexity: ['error', 10]`, `max-depth: ['error', 2]`.

---

## 3. MVVM — hook nunca encosta em JSX

A camada de apresentação não sabe de onde o dado vem. O view-model não sabe como o dado é
desenhado. Os dois se encontram na rota.

```
routes/tasks/index.tsx        →  compõe: chama o model, passa para a view
lib/view-models/…model.ts     →  estado, efeitos, queries, mutations, handlers. ZERO JSX.
lib/ui/composers/…view.tsx    →  função pura de props → JSX. ZERO hook de dado.
```

```ts
// ✅ lib/view-models/use-task-list.model.ts
export type TaskListModel = {
  data: { tasks: Task[]; total: number };
  state: { isLoading: boolean; isEmpty: boolean; error: string | null };
  actions: { onToggleDone: (task: Task) => void; onSearchChange: (search: string) => void };
};
```

```tsx
// ✅ routes/tasks/index.tsx — só composição
export const Route = createFileRoute('/tasks/')({ component: TaskListRoute });

function TaskListRoute() {
  const model = useTaskListModel();

  return <TaskListView data={model.data} state={model.state} actions={model.actions} />;
}
```

```tsx
// ✅ lib/ui/composers/task-list-view.component.tsx — sem nenhum hook de dado
function TaskListBody({ data, state, actions }: TaskListViewProps) {
  if (state.isLoading) return <TaskListSkeleton />;
  if (state.error) return <ErrorState data={{ message: state.error }} />;
  if (state.isEmpty) return <EmptyState data={{ title: 'Nenhuma tarefa ainda' }} />;

  return <ul>{/* ... */}</ul>;
}
```

**Permitido dentro de um componente de UI:** `useId`, `useRef` para DOM, `useState` de estado
puramente visual (mostrar/esconder a senha). **Proibido:** `useQuery`, `useMutation`,
`useNavigate`, acesso a store, `useEffect` que busca dado.

> Por que isso é rígido: toda tela precisa ser vista em carregamento, em erro, vazia e cheia —
> e todos esses estados têm de ser exercitáveis no Storybook, sem servidor. Um componente que
> busca o próprio dado só é testável subindo a API inteira.

**Lint:** `no-restricted-syntax` recusa `useQuery`/`useMutation`/`useNavigate` em `lib/ui/**` e
JSX em `lib/view-models/**`.

---

## 4. Props semanticamente separadas

Toda prop entra em um de quatro grupos. Nada de prop solta na raiz.

| Grupo | Contém | Nunca contém |
|---|---|---|
| `data` | Valores de domínio a exibir | Callback, classe CSS |
| `ui` | Só aparência: `variant`, `size`, `tone`, `align`, `className` | Dado, callback |
| `state` | Estado de interação: `isLoading`, `isDisabled`, `isOpen`, `error` | Dado de domínio |
| `actions` | Só callbacks, sempre `on*` | Qualquer outra coisa |

```tsx
// ❌ nunca
type TaskCardProps = { task: Task; variant: 'compact' | 'full'; isLoading: boolean; onOpen: (id: number) => void };

// ✅ sempre
type TaskCardProps = {
  data: { task: Task };
  ui?: { variant?: 'compact' | 'full'; className?: string };
  state?: { isLoading?: boolean; isDisabled?: boolean };
  actions?: { onOpen?: (id: number) => void };
};
```

A exceção é `children`, que fica na raiz — é como o React compõe.

Booleano de estado usa prefixo `is`/`has`. Callback usa prefixo `on`. O handler que o
view-model expõe usa o mesmo nome do callback que consome.

---

## 5. Componente baixado nunca mora com componente próprio

```
lib/vendor/ui/        ⛔ território do CLI do shadcn. NÃO EDITE.
lib/ui/primitives/    ✅ nosso. Indivisível: ActionButton, TextField, StatusBadge, EmptyState.
lib/ui/composers/     ✅ nosso. Compõe primitivos: AppShell, TaskListView, ConfirmDialog.
```

O `components.json` aponta a saída para `lib/vendor/ui`. Rodar `npx shadcn@latest add <nome>`
sobrescreve aquela pasta — e é para sobrescrever mesmo.

**Precisa mudar um componente baixado?** Não edite. Crie um primitivo nosso em
`lib/ui/primitives/` que envolve o vendor e aplica nossas variantes com `tv()` —
`action-button.component.tsx` é o exemplo. O app importa o nosso; ninguém importa `vendor/`
direto fora de `lib/ui/`.

**Lint:** `no-restricted-imports` bloqueia `lib/vendor/**` fora de `lib/ui/**`.

---

## 6. Storybook para 100% dos primitivos e compositores

Componente em `lib/ui/primitives/` ou `lib/ui/composers/` **sem** `.stories.tsx` não entra.

Cada story cobre, no mínimo:

1. **Default** — o uso mais comum
2. **Todas as variantes** de `ui`
3. **Estados** — loading, disabled, erro, vazio
4. **Caso limite** — texto longo que quebra o layout, lista com um item só

O item 3 é o que mais importa, e por um motivo prático: **o estado de erro é o que menos
aparece em desenvolvimento e o que mais aparece em produção.** Quem programa usa o caminho
certo; quem usa, não.

Componente de rota e view-model não têm story — não são componentes de UI reaproveitáveis.

---

## 7. Teste do caminho feliz e do caminho triste, sempre

Todo PR com lógica traz os dois. Um teste só do caminho feliz documenta a intenção; é o caminho
triste que pega a regressão. Nos arquivos de teste, os dois ficam marcados com `// feliz` e
`// triste`.

```ts
describe('toTaskUpdate', () => {
  // feliz
  it('updates only what came, and always re-stamps who edited', () => { /* ... */ });

  // triste
  it('does not let the body stamp authorship', () => { /* ... */ });
  it('clears the description when it comes as null, and ignores it when absent', () => { /* ... */ });
});
```

**O que precisa de teste:** regra de negócio (`shared/src/domain`), schema, view-model, mapper,
service, policy de acesso, qualquer correção de bug (teste que falha antes da correção). **O que
não precisa:** arquivo gerado, re-export, story.

**Toda escalada de privilégio tem teste.** Perfil somente leitura tentando escrever, identidade
pela metade, autoria enviada no corpo: cada uma é uma linha trocada que passa na revisão sem
ninguém ver.

**Níveis:** unitário (Vitest), componente (Vitest + Testing Library), E2E da API (Vitest +
Supertest contra SQLite em memória), E2E da web (Playwright), mutação (Stryker).

---

## 8. Backend

- **Subpasta por papel dentro do módulo.** `controller/`, `service/`, `repository/`,
  `mapper/`, `dto/` — cada arquivo mora na subpasta do papel que ele cumpre. Só o
  `<feature>.module.ts` fica fora, na raiz do módulo: é ele que aponta para todo o resto,
  e por isso funciona como o índice da pasta. Teste mora junto do que testa.
- **Módulo novo é registrado em `app.module.ts`.** Esquecer é o motivo nº 1 de "a rota dá 404".
- **Um caminho de escrita por dado.** Toda escrita de uma entidade passa pelo `service` dela.
  Controller não fala com repository, repository não tem regra.
  **Lint:** `no-restricted-imports` bloqueia `*.repository` em `*.controller.ts`.
- **Contrato antes do código.** O schema Zod vive em `shared/` (pacote `@template/shared`) e
  é importado pela API (DTO + Swagger via `nestjs-zod`) e pela web. Um schema, duas pontas.
- **Swagger é obrigatório.** Endpoint sem `@ApiOperation` e sem tipo de resposta não entra.
- **Quem editou vem da identidade**, nunca do corpo da requisição. `createdBy` e `updatedBy`
  são carimbados no mapper, a partir do que o middleware resolveu. Aceitar autoria do corpo é
  aceitar que alguém assine por outra pessoa.
- **Autorização de dado é a policy de `lib/policy`**, não `if` espalhado no controller nem no
  service. A conexão com o banco é única e privilegiada; o SQLite não sabe quem pediu. Existe
  **um lugar só** que responde quem-pode-o-quê, ele é **fechado por padrão** (nenhuma função
  devolve `true` por omissão) e é **testado sem banco**. Três coisas separadas de propósito:
  - `AuthenticationMiddleware` responde **quem é você** — vale para o sistema inteiro.
  - `RolesGuard` (`@Roles('admin')`) responde **se a requisição entra** — por rota.
  - `lib/policy` responde **o que essa pessoa pode fazer** — chamada no service, colada na
    escrita, para ninguém conseguir pular.
- **Só o `DbModule` abre o banco.** Toda porta para o SQLite passa por
  `lib/db/open-database.util.ts`, que liga `foreign_keys` (desligado por padrão no SQLite!) e
  aplica as migrations. **Lint:** `better-sqlite3` só pode ser importado em `lib/db/`.
- **Erro do banco não vira 200.** Status HTTP diz a verdade — 4xx para o cliente, 5xx para
  nós. Toda consulta passa por `runQuery`/`runMaybe`/`runOne` de `lib/db/db-error.util.ts`,
  que lê o `.cause` do erro do Drizzle e traduz o código do SQLite.

### Banco: SQLite + Drizzle

- **A tabela é TypeScript.** Uma por arquivo, em `server/src/lib/db/schema/<nome>.schema.ts`,
  registrada em `lib/db/drizzle-schema.ts`.
- **Mudou a tabela? `npm run db:generate`.** O `drizzle-kit` escreve a migration em
  `server/drizzle/`. A migration é versionada; **migration já commitada nunca é editada** —
  mudança nova é migration nova.
- **As migrations são aplicadas sozinhas** quando o server sobe e quando um seed roda.
- **O arquivo do banco (`server/data/app.db`) NÃO é versionado.** Cada máquina tem o seu.
  `npm run db:reset` apaga e recria com os seeds.
- **Enum do Drizzle só existe no TypeScript.** Valor que precisa ser recusado pelo banco ganha
  `check(...)` na tabela — `tasks_status_valid` é o exemplo.

> **Sem login, por decisão — e fora do alcance do MVP.** Não há tabela de usuário, tela de
> login, senha nem sessão, e não haverá: a identidade é do **auth-forward**, gerenciado pelo
> suporte. Os arquivos de identidade são protegidos (§17).
>
> **Estado atual.** Não há tabela de usuário. A identidade chega por
> auth-forward (`x-forwarded-user-*`), e até o provedor entrar ela é a pessoa fixa de
> `server/src/lib/auth/identity.provider.ts`, com papel `admin`. Cabeçalho que vem pela metade
> é recusado com 401 e **não** cai no mock. Ver README, "Como a identidade funciona".

---

## 9. Seeds — dados de teste

Seeds são **scripts versionados**, uma pasta por entidade, nunca dados embutidos no app.

```
scripts/seed/
├── seed.util.ts            # abre o banco, recusa produção, imprime o que gravou
├── seed-all.ts             # npm run seed:all — respeita a ordem de dependência
└── tasks/
    ├── tasks.data.ts       # OS DADOS — é aqui que se edita
    └── seed-tasks.ts       # como gravar (npm run seed:tasks)
```

Regras:

- **Idempotente.** Rodar duas vezes dá o mesmo resultado. Cada registro tem `id` fixo e é
  gravado com `onConflictDoUpdate`.
- **Ordem de dependência.** Quem é referenciado vem antes em `seed-all.ts`.
- **Nunca roda em produção.** `seed.util.ts` recusa com `NODE_ENV=production`.
- **Imprime o que gravou.**
- **Dado inventado, sempre.** Nome de cliente real, CPF, telefone, e-mail de pessoa de verdade
  não entram — o arquivo vai para o git e fica no histórico para sempre.
- **Inclui casos limite.** Título enorme, campo vazio, cada situação possível: o seed é o que
  faz a tela ser vista em todos os estados.

---

## 10. Nomes de arquivo

| Tipo | Padrão | Exemplo |
|---|---|---|
| Componente | `kebab-case.component.tsx` | `task-list-view.component.tsx` |
| Story | `kebab-case.stories.tsx` | `task-list-view.stories.tsx` |
| View-model | `use-<nome>.model.ts` | `use-task-list.model.ts` |
| Teste | `<arquivo>.test.ts` | `task-status.util.test.ts` |
| E2E | `<fluxo>.e2e.ts` | `tasks.e2e.ts` |
| Módulo Nest | `<feature>.<papel>.ts` | `tasks.service.ts` |
| Schema Zod | `<nome>.schema.ts` | `task.schema.ts` |
| Tabela Drizzle | `<nome-no-plural>.schema.ts` | `tasks.schema.ts` |
| Util puro | `<nome>.util.ts` | `format-date.util.ts` |
| Seed | `seed-<entidade>.ts` + `<entidade>.data.ts` | `seed-tasks.ts` |

Export nomeado sempre. `export default` só onde o framework exige (config, `meta` do
Storybook). **Arquivo de barril (`index.ts` que re-exporta) é proibido**: import aponta para o
arquivo, não para a pasta. **Lint:** `no-restricted-syntax` e `no-restricted-imports`.

---

## 11. Commits

Formato obrigatório, sem variação:

```
[tipo](local): Mensagem
```

```
[feat](backend): Endpoint de listagem de tarefas com filtro por situação
[fix](web): Erro do formulário some quando o título é corrigido
[refactor](web): Extrai view-model da tela de tarefas
[test](backend): Caminho triste da edição feita por perfil de consulta
[chore](docker): Sobe o Node da imagem para a 24 LTS
```

**Tipo** — o que a mudança é:

| Tipo | Quando |
|---|---|
| `feat` | Funcionalidade nova |
| `fix` | Correção de defeito |
| `refactor` | Muda a forma, não o comportamento |
| `test` | Só teste |
| `docs` | Só documentação |
| `style` | Só formatação, sem efeito em runtime |
| `perf` | Ganho de desempenho |
| `build` | Build, dependências, empacotamento |
| `ci` | Pipeline |
| `chore` | Manutenção que não cabe acima |

**Local** — onde a mudança aconteceu:

| Local | Alcance |
|---|---|
| `backend` | `acerola/server/` |
| `web` | `acerola/client/` |
| `db` | `acerola/server/drizzle/`, `acerola/server/src/lib/db/` e `acerola/scripts/seed/` |
| `contracts` | `acerola/shared/` (pacote `@template/shared`) |
| `docker` | `acerola/docker/` |
| `ci` | `.github/` |
| `docs` | `.md` na raiz |
| `deps` | Atualização de dependência |
| `claude` | `.claude/` e `CLAUDE.md` |

**Mensagem** — em português, primeira letra maiúscula, sem ponto final, no que a mudança
**faz** e não no que você mexeu. `Resolve o erro X` é melhor que `Alterações no service`.

Uma mudança que toca dois locais são dois commits. Se não der para separar, use o local mais
relevante — nunca `[feat](backend,web)`.

O formato é verificado por `commitlint` no hook de `commit-msg`: commit fora do padrão é
rejeitado antes de entrar. O `pre-commit` roda o lint. **`--no-verify` é proibido** — ele
desliga as duas travas de uma vez. Para o template aparecer no editor, uma vez por clone:

```bash
git config commit.template .gitmessage
```

---

## 12. Branches — Gitflow

O fluxo é o **Git-Flow do Tower**, instalado em todas as máquinas. O `npm install` configura o
Git-Flow sozinho (`scripts/git/setup-git.mjs`): `main`, `develop`, prefixos `feature/`,
`bugfix/`, `release/`, `hotfix/` e tag com `v`. O Tower abre o repositório já inicializado.

| Branch | Quem mexe | Sai de | Volta para |
|---|---|---|---|
| `main` | **Só quem administra o projeto** | — | — |
| `develop` | Todo mundo, **só por merge `--no-ff`** de feature aprovada | `main` | — |
| `feature/<nome>` | Todo mundo — é onde o trabalho acontece | `develop` | `develop` |
| `bugfix/<nome>` | Todo mundo — algo que funcionava e quebrou | `develop` | `develop` |
| `release/<versão>`, `hotfix/<versão>` | **Só quem administra o projeto** | — | `main` e `develop` |

Nome de branch em **inglês**, kebab-case, sem o tipo repetido dentro: `feature/task-due-date`.

### O ciclo de toda mudança

1. **Toda mudança de código nasce numa `feature/` ou `bugfix/`**, criada a partir da `develop`
   atualizada — antes do primeiro arquivo editado.
2. O trabalho é **commitado na branch**, em quantos commits for preciso.
3. No fim, a **`develop` é trazida para a branch** (`git merge develop`). Conflito se resolve
   **aqui**, na branch, nunca na develop.
4. **Verificação** (§14) e o sistema rodando.
5. **A pessoa que pediu confere e dá o OK** de que está funcionando. Sem OK, não há merge.
6. **`git merge --no-ff`** da branch na `develop`, envio da develop, e a branch é apagada.

O `--no-ff` é obrigatório: o histórico precisa mostrar que existiu uma feature, e é assim que
dá para desfazer uma funcionalidade inteira de uma vez.

### As travas

A regra não depende de ninguém lembrar dela. Os hooks do git (`scripts/git/branch-guard.sh`)
valem no terminal, no Claude e no Tower:

| Hook | Recusa |
|---|---|
| `pre-commit` | commit na `main`; commit direto na `develop` (concluir um merge é permitido) |
| `pre-merge-commit` | merge na `main` |
| `pre-push` | envio para a `main` |

A mensagem de recusa diz, em português, o que fazer — e que nada foi perdido.

**Quem administra** libera só a própria máquina, uma vez: `git config project.admin true`.
A chave fica no `.git/config` daquele clone e não é versionada. No GitHub, a `main` também deve
estar protegida (ver README, "Para quem administra"): o hook local não pega merge
*fast-forward*, e a proteção do servidor é a trava que ninguém desliga.

### Conflito

Conflito é normal quando várias pessoas mexem no mesmo sistema. Ele é explicado **pela tela
afetada**, com **quem** mudou e **quando** — lido do `git log` —, e as duas mudanças são
mantidas sempre que cabem juntas. Quando não cabem, quem decide é a pessoa, com as opções na
frente dela. A skill `resolver-conflito` faz isso.

A skill `git-fluxo` conduz o ciclo inteiro a partir de um pedido em português.

---

## 13. Versões — só o que ainda tem suporte

**Zero tolerância com dependência fora de suporte.** Um pacote sem suporte não recebe
correção de segurança.

### O runtime

O Node fica **na linha LTS, com a faixa fechada**:

```json
"engines": { "node": ">=24.0.0 <25.0.0", "npm": ">=10" }
```

A faixa é fechada de propósito: `>=24` aceitaria as linhas ímpares (25, 27), que **nunca são
LTS** e morrem em poucos meses. A versão também fica em `mise.toml`. Quando a linha LTS vira,
os dois arquivos mudam junto — e `@types/node` acompanha o runtime.

### As dependências

Na dúvida, **o major mais novo que funciona**. Antes de abrir PR:

```bash
npm outdated --workspaces --include-workspace-root
npm audit
```

### As exceções, e como registrá-las

Quando o ecossistema não acompanha, **a versão fica travada uma atrás e o motivo fica escrito
aqui** — travar sem registrar é como o projeto esquece por que não atualiza.

| Travado em | Por quê | Solta quando |
|---|---|---|
| **ESLint 9** | `eslint-plugin-react-hooks` e o resto do ecossistema de plugins só declaram peer até o 9. | Os plugins declararem `eslint@^10` |
| **TypeScript 5** | `openapi-typescript` exige `typescript@^5.x`. | `openapi-typescript` aceitar o 7 |
| **NestJS 11** | `nestjs-zod@5` só declara peer até `@nestjs/common@^11`. | `nestjs-zod` aceitar o 12 |

Uma trava dessas **não** é desculpa para `--force` nem para `legacy-peer-deps`: os dois
desligam a verificação do projeto inteiro e escondem o próximo conflito.

---

## 14. Definition of Done

O PR só entra com tudo marcado (a skill `verificar` roda as partes automáticas):

- [ ] Commits no formato `[tipo](local): Mensagem`
- [ ] Branch `feature/` ou `bugfix/` saiu de `develop`, e a `develop` foi trazida para ela no fim
- [ ] A pessoa que pediu conferiu e deu o OK de que está funcionando
- [ ] Merge na `develop` com `--no-ff` (nunca na `main`)
- [ ] `npm run lint`, `npm run typecheck` e `npm test` verdes
- [ ] `npm audit` sem nada alto ou crítico que não esteja na tabela de exceções (§13)
- [ ] Caminho feliz **e** caminho triste testados
- [ ] Story para todo primitivo/compositor novo ou alterado
- [ ] Endpoint novo documentado no Swagger
- [ ] Mudança de banco com migration gerada e seed atualizado
- [ ] Nenhum hook de dado dentro de componente de UI
- [ ] Props agrupadas em `data` / `ui` / `state` / `actions`
- [ ] Nenhum `else` alinhado
- [ ] Nada editado dentro de `lib/vendor/`
- [ ] `.env.example` atualizado se entrou variável nova
- [ ] Nenhuma chave ou dado real de cliente no diff — inclusive em seed, story e teste
- [ ] Idioma conferido (§1): nada em inglês na tela, nada em português em log/erro interno/teste

---

## 15. Travas — não remova sem conversar

Cada uma custou um incidente real num sistema da casa. Estão aqui para não serem redescobertas.

- **Falha de gravação precisa aparecer na tela**, em vermelho, com o motivo, até resolver.
  Aviso que some sozinho, ou erro que vai só para o console, vira chamado de "não está
  salvando" sem nada para investigar. Use `ErrorState`.
- **Vazio só é vazio depois que a consulta terminou.** "Nenhum registro" durante o carregamento
  faz a pessoa achar que os dados sumiram — e recarregar.
- **Vazio de verdade ≠ filtro que escondeu tudo.** O primeiro pede "cadastrar"; o segundo,
  "limpar filtros".
- **Lista nunca é truncada calada.** Veio menos do que existe? A tela diz.
- **Data inválida vira `null`, nunca uma data inventada.** `new Date(2025, 5, 31)` rola para
  01/07 sem erro nenhum.
- **Sessão nunca é persistida no navegador.** Num escritório de máquinas compartilhadas, token
  no `localStorage` faz a próxima pessoa herdar a conta da anterior.
- **Identidade pela metade é recusada.** Completar o que falta com um valor padrão daria acesso
  de administrador a uma requisição que ninguém soube identificar.
- **Automação não chuta.** O que não casa com nada conhecido vira pendência para uma pessoa
  decidir, nunca palpite gravado.
- **Botão que grava trava enquanto grava.** Dois cliques seriam dois registros.
- **Regra de unicidade mora no banco**, com `unique` ou `check`. Validação só na tela é
  contornada pelo primeiro seed, script ou aba duplicada.

---

## 16. Trabalhando com o Claude

- **Descreva o resultado, não o código.** "Quero cadastrar clientes com nome, telefone e
  cidade, e ver a lista filtrando por cidade" é um pedido completo. O Claude traduz isso no
  caminho inteiro (contrato → banco → API → tela → testes → seed).
- **Uma coisa de cada vez.** Uma feature por branch, um pedido por conversa quando possível.
- **Login e dados compartilhados não são do MVP.** Pediu tela de login, cadastro de usuário
  ou quer ver os mesmos dados em outro computador? O Claude explica por que não, e encaminha
  ao suporte (`SUPORTE.md`).
- **Erro grande não é remendado.** Se o problema está na estrutura do projeto, o Claude para,
  guarda o trabalho e prepara um relatório para você mandar ao suporte.
- **Toda mudança vira uma branch sozinha.** Você não precisa pedir: o Claude cria a
  `feature/`, trabalha nela e, no fim, pergunta se está funcionando. **Só com o seu OK** ele
  junta na `develop`. Se não estiver bom, é só dizer o que ajustar.
- **Peça para ver funcionando.** "Roda e me mostra" é um pedido válido — o Claude sobe o
  sistema e confere no navegador.
- **Erro na tela ou no terminal?** Copie e cole a mensagem inteira. A skill `socorro` cobre os
  problemas mais comuns de ambiente.
- **O Claude não publica nada sozinho.** Push, PR, deploy e apagar o banco sempre passam por
  uma pergunta antes.

---

## 17. Limites do MVP e suporte

### Identidade é do auth-forward

O MVP **não tem e não terá** login, cadastro de usuário, senha, sessão, "esqueci a senha",
logout nem permissão por pessoa. Quem diz quem é a pessoa é o **auth-forward**, na frente do
sistema, gerenciado pelo suporte. Os papéis são os três que existem (`admin`, `editor`,
`viewer`), e as features usam a policy de `lib/policy`.

### Dados são locais

O banco é um arquivo SQLite **no computador de cada pessoa**. O que é compartilhado é o código
e os dados de teste (seeds). Dados reais compartilhados, servidor e publicação são do suporte.

### Arquivos protegidos

Duas listas, em `acerola/scripts/git/`:

| Lista | O que protege | Por quê |
|---|---|---|
| `protected-auth.txt` + `protected-auth-deps.txt` | `lib/auth` (server e client), `user.schema.ts`, tabelas e módulos de usuário/sessão, rotas de login; bibliotecas de autenticação | É território do auth-forward |
| `protected-structure.txt` | `CLAUDE.md`, `CONTRIBUTING.md`, `SUPORTE.md`, `.claude/`, `.github/`, hooks, `scripts/git/`, configs de ESLint/TypeScript/Vitest/Stryker, commitlint, Docker, a abertura do banco e o filtro de erro HTTP | Mudar regra para um erro sumir esconde o defeito |

Duas travas leem as mesmas listas:

- **Claude Code** (`.claude/hooks/protect-paths.mjs`): recusa a edição do arquivo e a instalação
  da biblioteca, antes de acontecer.
- **git** (`branch-guard.sh`, no `pre-commit`): recusa o commit — vale também no terminal e no
  Tower. Concluir merge da `develop` é permitido: traz o que o suporte já aceitou.

Quem administra libera a própria máquina com `git config project.admin true`.

### Erro estrutural vai para o suporte

Não instala, não sobe, banco corrompido, migration quebrada, git em estado confuso, erro que só
some mexendo em arquivo protegido, ou o mesmo erro depois de duas tentativas: **parar, guardar o
trabalho e mandar o relatório ao suporte** (skill `suporte`). O contato está em `SUPORTE.md`.
