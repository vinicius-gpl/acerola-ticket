# CLAUDE.md

Instruções para o Claude Code neste repositório. Leia inteiro antes da primeira mudança.

## Quem você está ajudando

A pessoa do outro lado **provavelmente não é programadora**. Ela está construindo um MVP para
validar uma ideia, e conta com você para escrever o código no padrão da casa.

- **Converse em português do Brasil**, com palavras simples. Termo técnico só quando
  necessário, e explicado na primeira vez ("migration — o arquivo que cria a tabela no banco").
- **Pergunte sobre o resultado, não sobre a implementação.** "Quem pode apagar um cliente?" é
  uma boa pergunta. "Prefere `onDelete: cascade` ou `restrict`?" não é — decida você, pelo
  CONTRIBUTING, e explique em uma frase.
- **Antes de uma feature, confirme o entendimento em 3 a 5 linhas**: o que a pessoa vai
  conseguir fazer, quais campos, quem pode o quê. Só pergunte o que você não consegue decidir.
- **Mostre funcionando.** Ao terminar algo visível, suba o sistema e confira no navegador
  quando possível. Diga à pessoa onde clicar para ver.
- **No fim, resuma em linguagem de gente**: o que mudou, como ver, o que ficou pendente. Nada
  de lista de arquivos, a não ser que ela peça.

## MODO ADMIN vs MODO PADRÃO

Este repositório possui dois modos de operação para o git e o Claude:

- **Modo Padrão (usuário/desenvolvedor comum):**
  A pessoa é leiga ou está desenvolvendo features de rotina. Siga estritamente o `git-flow`:
  toda alteração em branch `feature/<nome>` ou `bugfix/<nome>`, `develop` só recebe merge `--no-ff`
  após validação na tela, `main` protegida, e arquivos de estrutura intocados.

- **Modo Admin (`git config project.admin true` ativo):**
  Quem está operando é o **administrador do projeto**.
  Para verificar se está ativo: `git config --get project.admin` (retorna `true`).
  Se o usuário pedir para ativar o modo admin: execute `git config project.admin true`.
  Se o usuário pedir para desativar: execute `git config --unset project.admin`.

  **Quando o Modo Admin estiver ativo, o Claude tem autonomia total e obedece aos comandos de git solicitados:**
  1. **Liberdade total no git**:
     - Pode alternar, commitar, mesclar e fazer push diretamente na branch `main`.
     - Pode commitar diretamente na `develop` ou criar releases/hotfixes conforme o Git-Flow do Tower.
     - Pode realizar qualquer operação avançada (`git merge`, `git rebase`, `git cherry-pick`, `git tag`).
     - Pode usar `--no-verify` se o admin optar por pular hooks ou verificações automáticas.
     - Pode fazer `git push` para qualquer branch remota (inclusive `origin main` ou com `--force` se expressamente solicitado).
  2. **Arquivos de estrutura liberados**:
     - O admin pode editar qualquer arquivo protegido da base (`CLAUDE.md`, `.claude/`, regras de lint, `tsconfig`, scripts git, CI, Docker). Os hooks do Claude (`protect-paths.mjs`) e do git (`branch-guard.sh`) reconhecem o admin e não bloqueiam.
  3. **Fluxo flexível**:
     - Se o admin quiser criar uma branch de feature normal, segue o fluxo; se quiser commitar direto ou mexer na `main`, faça o que o admin pedir.

## REGRA DE OURO — git (vale para Modo Padrão)

Siga a skill **`git-flow`** sempre que não estiver em Modo Admin com instruções diretas:

1. **Antes de editar qualquer arquivo**, a mudança ganha uma branch `feature/<nome>` (ou
   `bugfix/<nome>`) criada **a partir da `develop`**.
2. O trabalho é commitado **nessa branch** (`git-commit`).
3. No fim: trazer a `develop` para a branch (`git merge develop`), rodar `verify`, subir o
   sistema e mostrar à pessoa **como conferir**.
4. Perguntar: **"Está funcionando do jeito que você queria?"** e **esperar**.
5. **Só com um OK explícito**: `git merge --no-ff` da branch na `develop` e enviar a develop.
6. **A `main` é de quem administra** — no Modo Padrão, nem checkout, nem commit, nem merge, nem push
   (o hook `branch-guard.sh` recusa). Em Modo Admin (`git config project.admin true`), a `main` é totalmente liberada.
7. **Conflito** → skill `resolve-conflict`: explique pela **tela** afetada, com **quem** mudou
   e **quando** (do `git log`), resolva na branch de feature, nunca na develop.

## O QUE O MVP NÃO FAZ — e o que fazer quando pedirem

- **"Por que meus dados não aparecem no PC de outra pessoa?"** Os dados são **locais**: cada
  computador tem o próprio banco. Explique; se insistir (dados compartilhados, servidor,
  internet), encaminhe ao suporte → skill **`mvp-limits`**.
- **Erro estrutural grande** (não instala, não sobe, banco ou git em estado confuso, erro que
  só some mexendo em regra/configuração/arquivo protegido, mesmo erro depois de duas
  tentativas): no Modo Padrão, **pare**, guarde o trabalho e gere o relatório → skill **`support`**.
  Em Modo Admin, investigue e corrija diretamente a raiz do problema.

**Arquivos protegidos** (lista em `acerola/dashboard/scripts/git/protected-structure.txt`): a
base do projeto (regras de lint, tsconfig, hooks, CI, Docker, `CLAUDE.md`, `.claude/`…). Login e
autenticação **não** são bloqueados por padrão — ver CONTRIBUTING §17. Um hook do Claude Code
bloqueia a edição e o hook do git bloqueia o commit para usuários normais. **Em Modo Admin**,
ambos os hooks liberam o acesso sem restrições.

## As regras de código

O padrão está em **`CONTRIBUTING.md`**, e ele manda. Os pontos que mais quebram:

1. **Idioma:** o usuário vê → português. O usuário não vê (código, log, teste, erro interno,
   pasta de bucket, chave de storage, nome de arquivo e pasta, variável de ambiente) → inglês.
   Comentário em português, explicando o **porquê**.
2. **Early return.** Nunca `if/else` alinhado. Complexidade máxima 10.
3. **MVVM:** rota (`+page.svelte`) só compõe — só cor, espaço e layout, nunca UI/UX de
   componente · hook (`lib/hooks/use-*/use-*.svelte.ts`, pasta própria, prefixo `use-`) tem
   estado e dados, sem marcação · componente de UI é função pura de props, zero
   `createQuery`/`createMutation`/navegação direta.
4. **Props em quatro grupos:** `data`, `ui`, `state`, `actions`.
5. **`lib/components/ui/` e `lib/hooks/ui/` não se editam** (são do CLI do shadcn). Precisa
   mudar? Envolva num `acerola-*`. Existe no shadcn-svelte? Instale, não recrie.
   **Nunca reescreva um componente existente** — mude só o que foi pedido.
   **Todo componente próprio tem prefixo `acerola-*`**: genérico em `lib/components/acerola-*`,
   de feature em `routes/(app)/<feature>/components/acerola-*`.
   **Todo campo de formulário tem `h-10`**, definido no `acerola-*`, nunca na tela.
   Detalhes e checagens: skill **`design-system`**.
6. **Todo componente tem `.stories.svelte`** (default, variantes, estados, caso limite).
7. **Todo código com lógica tem teste do caminho feliz e do triste** (`// feliz`, `// triste`).
8. **Backend:** controller → service → repository. Policy no service. Autoria vem da
   identidade, nunca do corpo. Toda consulta passa por `runQuery`/`runMaybe`/`runOne`.
9. **Contrato em `shared/`:** o mesmo schema Zod valida a API e o formulário.
10. **Export nomeado. Sem barril (`index.ts`).**

## Use as skills

Antes de começar uma tarefa, veja se há skill para ela em `.claude/skills/` e siga-a:

| Pedido | Skill | Atalho pt-BR |
|---|---|---|
| Primeira vez no projeto, "como rodo isso?" | `getting-started` | `/comecar` |
| Dar nome ao MVP (título das telas) | `rename-project` | `/renomear-projeto` |
| Funcionalidade nova, tela nova com dados | `new-feature` | `/nova-feature` |
| **Criar, mover ou renomear qualquer arquivo**; "isso está no lugar certo?" | `design-system` | `/sistema-de-design` |
| Componente visual novo ou alterado | `ui-component` (e `ui-standards` como referência) | `/componente-ui` |
| Tabela nova, campo novo, "apaga o banco" | `database` | `/banco-de-dados` |
| Dados de teste | `seed-data` | `/dados-de-teste` |
| "Salva", "commita" | `git-commit` | `/commitar` |
| **Qualquer mudança de código** (começar, terminar, juntar, enviar) | `git-flow` | `/git-fluxo` |
| Conflito de merge | `resolve-conflict` | `/resolver-conflito` |
| "Está pronto?", antes de commit de feature | `verify` | `/verificar` |
| Tirar a feature de Tarefas | `remove-example` | `/remover-exemplo` |
| Erro de ambiente, porta ocupada, instalação | `troubleshoot` | `/socorro` |
| Dados em outro PC, servidor, internet | `mvp-limits` | `/limites-do-mvp` |
| Erro estrutural grande, bloqueio de arquivo de estrutura | `support` | `/suporte` |

A pessoa pode chamar pelo nome em inglês (`/troubleshoot`) ou pelo atalho em português
(`/socorro`); os dois fazem o mesmo. `/help` não serve de atalho: é comando nativo do Claude Code.

**A feature de Tarefas é o molde.** Quando for criar algo, abra o arquivo equivalente de
`tasks`/`task` e siga a mesma forma — nomes, comentários, estados, testes.

## Onde fica cada coisa

O sistema fica em **`acerola/dashboard/`** (uma pasta abaixo da raiz). Todo comando `npm` roda lá.

```
acerola/dashboard/shared/src/{domain,schemas}/        contrato e regra pura
acerola/dashboard/server/src/lib/db/schema/           tabelas (Drizzle, Postgres/Neon)
acerola/dashboard/server/src/modules/<feature>/       API
acerola/dashboard/server/drizzle/                     migrations (geradas — não edite à mão)
acerola/dashboard/client/src/routes/(app)/<feature>/  tela (só composição, SvelteKit)
acerola/dashboard/client/src/routes/(app)/<feature>/components/acerola-<nome>/  componente da feature
acerola/dashboard/client/src/lib/hooks/use-<nome>/    estado e dados das telas
acerola/dashboard/client/src/lib/components/acerola-<nome>/  componente genérico
acerola/dashboard/client/src/lib/components/ui/       ⛔ CLI do shadcn (lib/hooks/ui/ idem)
acerola/dashboard/client/src/lib/navigation/          menu lateral
acerola/dashboard/scripts/seed/<entidade>/            dados de teste
```

## Comandos

```bash
cd acerola/dashboard
npm run dev            # API :3336 + tela :5176
npm run seed:all       # dados de teste (idempotente)
npm run db:generate    # depois de mudar tabela
npm run lint           # ESLint
npm run typecheck      # TypeScript
npm test               # unidade + componente
npm run test:e2e -w server   # E2E da API (banco de teste na Neon, TEST_DATABASE_URL)
npm run build          # build de produção
```

`npm run dev` roda em segundo plano (é um servidor que não termina). Para conferir a tela,
use o navegador em http://localhost:5176.

## O que SEMPRE pede confirmação antes

- `npm run db:reset` — **apaga os dados** no banco Postgres (Neon).
- `git merge --no-ff` na develop — no Modo Padrão, só depois do OK da pessoa de que está funcionando.
- `git push`, abrir PR, criar repositório, qualquer coisa que saia da máquina.
- `git reset --hard`, `git checkout -- .`, `git clean`, apagar branch — perde trabalho.
- `git push --force` — sobrescreve histórico remoto (permitido em Modo Admin quando solicitado).
- Mudar ou apagar migration que já foi commitada.
- Instalar dependência nova (diga qual e por quê em uma frase).

## O que NUNCA fazer

### No Modo Padrão (sem `project.admin` ativo):
- Qualquer operação na `main`.
- Commit direto na `develop`, ou merge nela sem o OK da pessoa.
- `git commit --no-verify` ou qualquer forma de pular os hooks. Se o hook recusar, corrija.
- Ativar `git config project.admin true` por conta própria sem pedido explícito do usuário.
- Editar arquivo protegido, ou contornar os hooks que o protegem.
- Remendar erro estrutural (desligar regra, `@ts-ignore`, `eslint-disable`, apagar teste,
  `--force`) em vez de acionar o suporte.

### Em qualquer modo (mesmo em Modo Admin):
- `npm install --force` ou `--legacy-peer-deps`.
- Editar arquivo em `lib/components/ui/` ou `lib/hooks/ui/` (envolva num `acerola-*`), `routeTree.gen.ts` ou `server/drizzle/meta/`.
- Reescrever componente existente além do que foi pedido, ou recriar à mão componente que o shadcn-svelte já tem.
- Criar componente em `lib/components/` que só uma feature usa, ou pasta em `lib/` fora do mapa da skill `design-system`.
- Colocar segredo em variável `VITE_` ou em arquivo versionado (`.env`).
- Colocar dado real de pessoa ou cliente em seed, story ou teste.
- Dizer que terminou sem ter rodado `lint`, `typecheck` e os testes do que mudou (a menos que o admin tenha pedido especificamente para ignorar).
