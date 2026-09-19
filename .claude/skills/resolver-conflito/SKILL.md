---
name: resolver-conflito
description: Resolve conflito de merge explicando para uma pessoa leiga, em linguagem de tela — qual tela ou parte do sistema, quem mudou, em que dia e o que mudou (lido do histórico do git) — e decide com ela quando as duas mudanças não cabem juntas. Use sempre que um git merge, pull ou switch parar com CONFLICT, ou quando o git status mostrar "both modified"/"Unmerged paths".
---

# Resolver conflito

A pessoa **não sabe o que é conflito** e vai achar que quebrou algo. O trabalho aqui é:
tranquilizar, explicar o que aconteceu **na tela**, resolver o que dá para resolver sozinho e
**perguntar** só o que é decisão dela.

Conflito se resolve **na branch de feature**, nunca na `develop` (ver `git-fluxo`). Se você
está na develop no meio de um merge com conflito: `git merge --abort`, vá para a feature,
`git merge develop`, e resolva lá.

## 1. Primeira mensagem (antes de investigar)

Algo como:

> Enquanto você trabalhava, outra pessoa mudou algumas das mesmas partes do sistema. Nada foi
> perdido — o git parou para a gente decidir junto como ficam as duas mudanças. Vou ver o que
> cada um fez e já te explico.

## 2. Levantar os fatos

```bash
git status --short
git diff --name-only --diff-filter=U
```

Para **cada arquivo em conflito**, quem mudou e quando, dos dois lados:

```bash
git log --merge --left-right --date=format:"%d/%m/%Y às %H:%M" \
  --format="%m|%an|%ad|%s" -- <arquivo>
```

- `<` = o que veio **desta branch** (o trabalho da pessoa com você).
- `>` = o que veio **da develop** (o trabalho dos outros).

E o que exatamente colide:

```bash
git diff -- <arquivo>
```

Leia os blocos `<<<<<<<` / `=======` / `>>>>>>>` e **entenda a intenção de cada lado** — não
só as linhas.

## 3. Traduzir arquivo → parte do sistema

Nunca diga o caminho do arquivo para a pessoa. Diga **a tela ou a parte** que ela reconhece:

| Arquivo (em `template/`) | Como falar |
|---|---|
| `client/src/routes/<rota>/...` | "a tela **<título>**" — o título está no `PageHeader` da view que a rota usa |
| `client/src/lib/ui/composers/<x>-view.component.tsx` | "a tela **<título do PageHeader>**" |
| `client/src/lib/ui/composers/<x>-form-dialog.component.tsx` | "o formulário de **<x>**" (título do `DialogTitle`) |
| `client/src/lib/view-models/use-<x>.model.ts` | "o funcionamento da tela **<x>**" (filtros, botões, o que carrega) |
| `client/src/lib/ui/primitives/<x>.component.tsx` | "o componente **<x>**, usado nas telas A, B…" (descubra com `Grep` quem importa) |
| `client/src/lib/ui/navigation.ts` | "o **menu lateral**" |
| `client/src/lib/theme/tokens.css` | "as **cores** do sistema" |
| `shared/src/schemas/<x>.schema.ts` | "as **regras do cadastro de <x>**" (campos obrigatórios, limites, mensagens de erro) |
| `shared/src/domain/<x>.util.ts` | "a **regra de <o que a função calcula>**" |
| `server/src/modules/<x>/...` | "a parte do sistema que **guarda e busca <x>**" |
| `server/src/lib/db/schema/<x>.schema.ts` | "a **tabela de <x>** no banco" |
| `server/drizzle/**` | "o **histórico de mudanças do banco**" — ver §5 |
| `scripts/seed/<x>/...` | "os **dados de teste de <x>**" |
| `package.json`, `package-lock.json` | "a **lista de bibliotecas** do projeto" — ver §5 |
| `*.test.ts(x)`, `*.stories.tsx` | "os **testes**" / "o **catálogo visual**" da parte correspondente |
| `README.md`, `CONTRIBUTING.md`, `.claude/**` | "a **documentação**" |

## 4. Explicar e decidir

Para cada parte em conflito, **uma frase por lado**, com pessoa, dia e o que mudou em termos de
tela — tirado do `git log` e da leitura do diff:

> **Tela Clientes**
> - No dia **14/09/2026 às 15:20**, **Ana** mudou o texto do botão de "Novo cliente" para
>   "Cadastrar cliente" (*"Botão de cadastro com texto mais claro"*).
> - Nesta sua mudança, nós colocamos um **filtro por cidade** no mesmo pedaço da tela.

Depois classifique:

### As duas mudanças cabem juntas (o caso comum)

Resolva mantendo as duas. Conte o resultado e siga — sem pedir decisão:

> Dá para manter as duas: o botão fica com o texto novo da Ana, e o filtro por cidade
> continua. Já ajustei.

### As duas mudanças disputam a mesma coisa

(mesmo texto com valores diferentes, um lado apagou o que o outro alterou, regras
contraditórias.) **Pergunte**, com opções fechadas e a sua recomendação:

> O título da tela foi mudado pelos dois lados:
> 1. **"Clientes ativos"** — como a Ana deixou no dia 14/09
> 2. **"Carteira de clientes"** — como a gente fez agora
>
> Eu iria de **1**, porque a Ana mudou por último e a tela de relatórios já usa esse nome.
> Qual fica?

Se a decisão envolver o trabalho de outra pessoa de forma relevante (apagar o que ela fez,
mudar uma regra que ela criou), sugira **conversar com ela** antes, e mostre o nome.

## 5. Casos especiais (resolva sem perguntar, e conte o que fez)

- **`package-lock.json`**: fique com a versão da develop e regenere.
  ```bash
  git checkout --theirs -- template/package-lock.json   # "theirs" = develop, neste merge
  ```
  Resolva o `package.json` à mão (as duas listas somadas) e rode `cd template && npm install`.
- **`server/drizzle/`** (migrations): **nunca** junte SQL à mão.
  1. Fique com **todas** as migrations e o `meta/` da develop (`git checkout --theirs --
     template/server/drizzle`).
  2. Resolva os arquivos de **schema** (`server/src/lib/db/schema/`) mantendo as duas mudanças.
  3. Apague do disco as migrations que eram **só desta branch** (as que não estão na develop).
  4. `npm run build -w @template/shared && npm run db:generate` — gera uma migration nova com a
     sua mudança, em cima das da develop.
  5. Avise a pessoa que o banco local dela precisa ser recriado (`db:reset`, **com
     confirmação**) se a migration antiga já tinha sido aplicada.
- **`routeTree.gen.ts`**: não é versionado; se aparecer, `npm run routes -w client`.
- **Dados de teste** (`*.data.ts`): some os registros dos dois lados; se dois usarem o mesmo
  `id`, renumere os desta branch para o próximo livre.

## 6. Concluir

```bash
git add <arquivos resolvidos>
git diff --name-only --diff-filter=U     # precisa estar vazio
```

Rode a skill **`verificar`** inteira — conflito resolvido que não compila é pior que conflito.
Depois:

```bash
git commit --no-edit
```

(A mensagem "Merge branch 'develop' into feature/…" é gerada pelo git e aceita pelo
commitlint.)

Volte ao ponto do `git-fluxo` de onde veio (normalmente a Fase 3.3). Se o que chegou da develop
mudou algo que a pessoa já tinha testado, diga isso quando pedir o OK.

## 7. Desistir com segurança

A qualquer momento, se a pessoa preferir parar ou a situação ficar confusa:

```bash
git merge --abort
```

Tudo volta a como estava antes do merge. Diga isso a ela com essas palavras: **"voltei tudo
para antes da junção; nada foi perdido"**.

## Nunca

- `git checkout --ours/--theirs` num arquivo de **código** inteiro sem ter lido os dois lados —
  isso apaga em silêncio o trabalho de alguém.
- Resolver na develop.
- Dizer "resolvi o conflito" sem ter rodado `verificar`.
- Culpar a outra pessoa. Conflito é normal quando duas pessoas trabalham no mesmo sistema.
