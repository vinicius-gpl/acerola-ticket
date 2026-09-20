---
name: socorro
description: Diagnostica e resolve os problemas mais comuns de ambiente e execução — Node na versão errada, falha no npm install, porta ocupada, tela em branco, banco travado ou desatualizado, hook de commit recusando, Storybook e Playwright. Use quando algo não roda, aparece um erro no terminal ou no navegador, ou a pessoa diz "não funciona", "deu erro", "travou".
---

# Socorro

Primeiro, **peça ou leia a mensagem de erro inteira** (terminal e console do navegador, F12).
Explique para a pessoa em uma frase o que aconteceu antes de corrigir.

## `node -v` não é 24 / aviso `EBADENGINE`

O projeto exige **Node 24 LTS**. Com 25 costuma funcionar, mas não é suportado; com 22 ou menos,
não sobe. Peça para instalar o 24 (https://nodejs.org, "LTS") ou `mise install` na raiz de
`acerola/dashboard/`. Depois: apagar `acerola/dashboard/node_modules` e `npm install` de novo.

## `npm install` falha

| Mensagem | O que fazer |
|---|---|
| `better-sqlite3` ... `gyp` / `prebuild` | Node fora do 24, ou antivírus bloqueando. Confira `node -v`; apague `node_modules` e reinstale. |
| `ERESOLVE` / peer dependency | **Não** use `--force`/`--legacy-peer-deps`. Alguém mudou versão no `package.json`: veja `git diff package.json`. |
| `EPERM` / `EBUSY` (Windows) | Algum processo segura o arquivo: pare o `npm run dev`, feche o Storybook, tente de novo. |
| `.git can't be found` (husky) | O projeto foi baixado sem git (.zip). As travas e o Git-Flow não funcionam assim: clone o repositório pelo GitHub ou pelo Tower. |

## `address already in use :3333` ou `:5173`

Já tem uma cópia rodando. Feche o outro terminal. No Windows, para achar e parar:

```bash
netstat -ano | findstr :3333
taskkill /PID <número> /F
```

Porta ocupada por outro programa? `API_PORT` no `server/.env` e `VITE_API_PORT` no
`client/.env` (as duas juntas).

## Tela em branco ou "Não consegui falar com o servidor"

1. O server subiu? No terminal do `npm run dev` precisa aparecer `API em http://localhost:3333/api`.
2. Erro no terminal do `[server]`? Resolva aquele primeiro.
3. Console do navegador (F12): erro de import → `npm run build -w @template/shared` e recarregar.
4. Rota nova que dá "Esta tela não existe": o arquivo está em `client/src/routes/<nome>/index.tsx`
   e exporta `Route` com o caminho certo? O Vite regenera `routeTree.gen.ts` sozinho; se não,
   `npm run routes -w client`.

## Erro de API

| Status | Significa |
|---|---|
| 400/422 | O corpo não bate com o schema do `shared` — a mensagem diz o campo |
| 401 | Cabeçalho `x-forwarded-user-*` pela metade (não deveria acontecer em desenvolvimento) |
| 403 | A policy recusou — perfil sem permissão |
| 404 na rota inteira | Módulo não registrado em `server/src/app.module.ts` |
| 409 | Registro repetido (constraint `unique`) |
| 500 | Defeito nosso: o motivo está no terminal do `[server]` |
| 503 | Banco ocupado (ver abaixo) |

## Banco

| Sintoma | O que fazer |
|---|---|
| `no such table` / `no such column` | Migration não gerada: `banco-de-dados` → gerar. Se foi gerada, reinicie o server. |
| `database is locked` / 503 | Outro programa com o banco aberto e gravando (Drizzle Studio, SQLite Viewer, seed). Feche e tente de novo. |
| Dados estranhos, quer recomeçar | `npm run db:reset` — **apaga tudo, peça confirmação.** Pare o `npm run dev` antes. |
| `EBUSY` ao apagar o `.db` (Windows) | O server ainda está rodando: pare-o. |

## O commit foi recusado

- **"✋ A branch main é protegida"**, **"Na branch develop só entram…"**, **"Juntar/Enviar para a
  main é tarefa de quem administra"** → está na branch errada. Nada foi perdido: siga o
  `git-fluxo` (Fase 1), que leva as alterações para uma branch de feature. Explique à pessoa
  que a trava existe para proteger a versão principal.
- `subject-empty`, `type-enum`, `scope-enum`, "header" → formato da mensagem: `git-commit`.
- Erro de ESLint → o `pre-commit` roda o lint: corrija o código.
- **Nunca** `--no-verify`.

## Conflito ("CONFLICT", "Unmerged paths", "both modified")

Skill `resolver-conflito`.

## O Tower mostra algo diferente

O Tower lê a configuração de Git-Flow do `.git/config` (feita no `npm install`). Se ele pedir
para "inicializar o Git-Flow", rode `cd acerola/dashboard && npm run prepare` e reabra o repositório no
Tower. As branches devem ser `main` e `develop`, com prefixo `feature/`.

## Storybook não abre

`npm run storybook` (em `acerola/dashboard/`) e http://localhost:6006. Erro de story específica → a story
importa algo que precisa de provider (router, query): veja como `app-shell.stories.tsx` faz.

## Playwright (`test:e2e` da tela)

Primeira vez: `cd acerola/dashboard/dashboard/client && npx playwright install chromium` (baixa um navegador —
avise a pessoa, são ~150 MB). Ele sobe o sistema sozinho, com um banco separado
(`server/data/e2e.db`).

## Bloqueio "território do auth-forward" ou "base e regras do projeto"

Não é defeito: é trava. Login/identidade → skill `limites-do-mvp`. Estrutura → skill `suporte`.
Nunca contorne.

## Nada acima resolveu

**Duas tentativas sem resolver, ou o erro está na estrutura → skill `suporte`.** Ela guarda o
trabalho e prepara o relatório. Não apague `node_modules`, banco ou branch "para ver se
resolve".
