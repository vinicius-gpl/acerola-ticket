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

## REGRA DE OURO — git (vale para TODA mudança de código)

Siga a skill **`git-fluxo`** sempre, sem exceção e sem a pessoa precisar pedir:

1. **Antes de editar qualquer arquivo**, a mudança ganha uma branch `feature/<nome>` (ou
   `bugfix/<nome>`) criada **a partir da `develop`**.
2. O trabalho é commitado **nessa branch** (`git-commit`).
3. No fim: trazer a `develop` para a branch (`git merge develop`), rodar `verificar`, subir o
   sistema e mostrar à pessoa **como conferir**.
4. Perguntar: **"Está funcionando do jeito que você queria?"** e **esperar**.
5. **Só com um OK explícito**: `git merge --no-ff` da branch na `develop` e enviar a develop.
6. **A `main` nunca é tocada** — nem checkout, nem commit, nem merge, nem push. Ela é de quem
   administra o projeto. Release e hotfix também. O git recusa (hook `branch-guard.sh`); não
   procure contorno.
7. **Conflito** → skill `resolver-conflito`: explique pela **tela** afetada, com **quem** mudou
   e **quando** (do `git log`), resolva na branch de feature, nunca na develop.

## O QUE O MVP NÃO FAZ — e o que fazer quando pedirem

- **"Por que meus dados não aparecem no PC de outra pessoa?"** Os dados são **locais**: cada
  computador tem o próprio banco. Explique; se insistir (dados compartilhados, servidor,
  internet), encaminhe ao suporte → skill **`limites-do-mvp`**.
- **Erro estrutural grande** (não instala, não sobe, banco ou git em estado confuso, erro que
  só some mexendo em regra/configuração/arquivo protegido, mesmo erro depois de duas
  tentativas): **pare**, guarde o trabalho e gere o relatório → skill **`suporte`**.

**Arquivos protegidos** (lista em `acerola/dashboard/scripts/git/protected-structure.txt`): a
base do projeto (regras de lint, tsconfig, hooks, CI, Docker, `CLAUDE.md`, `.claude/`…). Login e
autenticação **não** são bloqueados por padrão — ver CONTRIBUTING §17. Um hook do Claude Code
bloqueia a edição e o hook do git bloqueia o commit. **Bloqueio não se contorna** — nem por
`Bash`, nem por outro caminho: ele indica qual skill seguir.

## As regras de código

O padrão está em **`CONTRIBUTING.md`**, e ele manda. Os pontos que mais quebram:

1. **Idioma:** o usuário vê → português. O usuário não vê (código, log, teste, erro interno) →
   inglês. Comentário em português, explicando o **porquê**.
2. **Early return.** Nunca `if/else` alinhado. Complexidade máxima 10.
3. **MVVM:** rota (`+page.svelte`) só compõe · hook (`lib/hooks/use-*/use-*.svelte.ts`) tem
   estado e dados, sem marcação · componente de UI é função pura de props, zero
   `createQuery`/`createMutation`/navegação direta.
4. **Props em quatro grupos:** `data`, `ui`, `state`, `actions`.
5. **`lib/components/ui/` não se edita.** Precisa mudar? Envolva num componente próprio em
   `lib/components/<nome>/`.
6. **Todo componente tem `.stories.svelte`** (default, variantes, estados, caso limite).
7. **Todo código com lógica tem teste do caminho feliz e do triste** (`// feliz`, `// triste`).
8. **Backend:** controller → service → repository. Policy no service. Autoria vem da
   identidade, nunca do corpo. Toda consulta passa por `runQuery`/`runMaybe`/`runOne`.
9. **Contrato em `shared/`:** o mesmo schema Zod valida a API e o formulário.
10. **Export nomeado. Sem barril (`index.ts`).**

## Use as skills

Antes de começar uma tarefa, veja se há skill para ela em `.claude/skills/` e siga-a:

| Pedido | Skill |
|---|---|
| Primeira vez no projeto, "como rodo isso?" | `comecar` |
| Dar nome ao MVP (título das telas) | `renomear-projeto` |
| Funcionalidade nova, tela nova com dados | `nova-feature` |
| Componente visual novo ou alterado | `componente-ui` (e `ui-padrao` como referência) |
| Tabela nova, campo novo, "apaga o banco" | `banco-de-dados` |
| Dados de teste | `dados-de-teste` |
| "Salva", "commita" | `git-commit` |
| **Qualquer mudança de código** (começar, terminar, juntar, enviar) | `git-fluxo` |
| Conflito de merge | `resolver-conflito` |
| "Está pronto?", antes de commit de feature | `verificar` |
| Tirar a feature de Tarefas | `remover-exemplo` |
| Erro de ambiente, porta ocupada, instalação | `socorro` |
| Dados em outro PC, servidor, internet | `limites-do-mvp` |
| Erro estrutural grande, bloqueio de arquivo de estrutura | `suporte` |

**A feature de Tarefas é o molde.** Quando for criar algo, abra o arquivo equivalente de
`tasks`/`task` e siga a mesma forma — nomes, comentários, estados, testes.

## Onde fica cada coisa

O sistema fica em **`acerola/dashboard/`** (uma pasta abaixo da raiz). Todo comando `npm` roda lá.

```
acerola/dashboard/shared/src/{domain,schemas}/        contrato e regra pura
acerola/dashboard/server/src/lib/db/schema/           tabelas (Drizzle, Postgres/Neon)
acerola/dashboard/server/src/modules/<feature>/       API
acerola/dashboard/server/drizzle/                     migrations (geradas — não edite à mão)
acerola/dashboard/client/src/routes/                  telas (só composição, SvelteKit)
acerola/dashboard/client/src/lib/hooks/<nome>/        estado e dados das telas
acerola/dashboard/client/src/lib/components/          componentes
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

- `npm run db:reset` — **apaga os dados** da pessoa no banco Postgres (Neon).
- `git merge --no-ff` na develop — só depois do OK da pessoa de que está funcionando.
- `git push`, abrir PR, criar repositório, qualquer coisa que saia da máquina.
- `git reset --hard`, `git checkout -- .`, `git clean`, apagar branch — perde trabalho.
- Mudar ou apagar migration que já foi commitada.
- Instalar dependência nova (diga qual e por quê em uma frase).

## O que NUNCA fazer

- Qualquer operação na `main`, ou `git config project.admin` (é a chave de quem administra).
- Commit direto na `develop`, ou merge nela sem o OK da pessoa.
- `git commit --no-verify` ou qualquer forma de pular os hooks. Se o hook recusar, corrija.
- `npm install --force` ou `--legacy-peer-deps`.
- Editar arquivo em `lib/components/ui/`, `routeTree.gen.ts` ou `server/drizzle/meta/`.
- Editar arquivo protegido, ou contornar os hooks que o protegem.
- Remendar erro estrutural (desligar regra, `@ts-ignore`, `eslint-disable`, apagar teste,
  `--force`) em vez de acionar o suporte.
- Colocar segredo em variável `VITE_` ou em arquivo versionado.
- Colocar dado real de pessoa ou cliente em seed, story ou teste.
- Dizer que terminou sem ter rodado `lint`, `typecheck` e os testes do que mudou.
