---
name: git-commit
description: Salva o trabalho no histórico do git no formato obrigatório [tipo](local) Mensagem — separa por local, escreve a mensagem em português no que a mudança faz, respeita os hooks de lint e commitlint. Use quando a pessoa pede "salva", "commita", "guarda o que fizemos", ou ao fim de cada etapa de uma feature.
---

# Commit

## 1. Onde estou?

```bash
git status
git branch --show-current
```

- Em `main` ou `develop`? **Não commite aí** — o git recusa. Crie a branch antes, pela skill
  `git-fluxo` (Fase 1): as mudanças não commitadas vão junto para a branch nova.
- Commit na branch de feature é só um **ponto de salvamento**: não precisa do OK da pessoa. O
  OK é para juntar na develop, e isso é a Fase 4 do `git-fluxo`.
- Nada para commitar? Diga isso e pare.

## 2. Separar por local

Uma mudança que toca dois locais são **dois commits**. Os locais:

| Local | Arquivos |
|---|---|
| `contracts` | `acerola/dashboard/shared/` |
| `db` | `acerola/dashboard/server/src/lib/db/`, `acerola/dashboard/server/drizzle/`, `acerola/dashboard/scripts/seed/` |
| `backend` | o resto de `acerola/dashboard/server/` |
| `web` | `acerola/dashboard/client/` |
| `docker` | `acerola/dashboard/docker/` |
| `ci` | `.github/` |
| `docs` | `.md` da raiz |
| `deps` | só `package.json`/`package-lock.json` por atualização de dependência |
| `claude` | `.claude/`, `CLAUDE.md` |

Ordem quando é uma feature: `contracts` → `db` → `backend` → `web`.
Arquivo que não cabe em nenhum (ex.: `acerola/dashboard/package.json` com script novo de seed): junte
com o local mais relevante da mesma mudança.

Adicione **por caminho**, nunca `git add -A` às cegas:

```bash
git add acerola/dashboard/shared
git diff --cached --stat     # confira o que vai
```

**Nunca** adicione: `.env`, `*.db`, `node_modules`, `dist`, `coverage`. Se aparecerem no
status, o `.gitignore` está errado — avise.

## 3. A mensagem

```
[tipo](local): Mensagem
```

- **tipo:** `feat` · `fix` · `refactor` · `test` · `docs` · `style` · `perf` · `build` · `ci` · `chore`
- **Mensagem em português**, primeira letra maiúscula, **sem ponto final**, até ~90 caracteres.
- Diga o que a mudança **faz** para quem usa ou mantém, não em que arquivo mexeu.

| ❌ | ✅ |
|---|---|
| `[feat](web): Alterações na tela` | `[feat](web): Lista de clientes com filtro por cidade` |
| `[fix](backend): fix bug` | `[fix](backend): Perfil de consulta não consegue mais excluir pedido` |
| `[feat](backend,web): Clientes` | dois commits |

Se precisar de corpo (o porquê de uma decisão), deixe uma linha em branco e escreva em
português.

```bash
git commit -m "[feat](contracts): Contrato de clientes com telefone obrigatório"
```

Termine a mensagem com as linhas de atribuição que o sistema indicar, se houver.

## 4. O hook recusou

- **commitlint** (formato): corrija a mensagem e tente de novo.
- **pre-commit** (`npm run lint`): leia o erro, **corrija o código**, `git add` de novo, commite.

- **"✋ A branch main é protegida"** / **"Na branch develop só entram…"** → você está na branch
  errada. Siga o `git-fluxo` (Fase 1) — não procure contorno.
- **"✋ Login e identidade…"** / **"Bibliotecas de login…"** → desfaça essas mudanças
  (`git restore --staged` e `git restore` nos arquivos citados, explicando à pessoa) e siga
  `limites-do-mvp`.
- **"✋ Estes arquivos são a base e as regras do projeto…"** → não commite esses arquivos;
  skill `suporte`.

**NUNCA** use `--no-verify`. Ele desliga o lint, o formato e a trava de branch de uma vez. Se o
lint falha num arquivo que você não mexeu, conserte ou avise a pessoa — não pule.

## 5. Depois

Mostre em uma linha o que foi salvo (`git log --oneline -3`). **Não faça `git push`** sem a
pessoa pedir — push publica. Terminar e juntar na develop é o `git-fluxo`, Fase 3.
