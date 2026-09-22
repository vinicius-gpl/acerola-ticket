---
name: suporte
description: Quando PARAR — erros estruturais grandes (projeto não instala ou não sobe, banco corrompido ou migration quebrada, git em estado confuso, erro que só some mexendo em configuração, regra de lint, trava ou arquivo protegido, mesmo erro depois de duas tentativas). Preserva o trabalho, não tenta remendo e gera um relatório claro pra pessoa investigar com calma. Use também quando um hook bloquear arquivo de estrutura, ou a pessoa pedir "chama o responsável", "isso é grande demais".
---

# Suporte — quando parar

A pessoa é **100% leiga**. Um remendo em erro estrutural vira um problema que ninguém consegue
entender depois. Neste caso, o melhor trabalho é **parar, guardar tudo e entregar um relatório
claro** — para a própria pessoa (ou quem ela chamar) investigar com calma, sem o risco de
mexer mais fundo no meio do problema.

## É erro grande? (qualquer um destes → siga esta skill)

**Estrutura**
- `npm install` falha e a skill `socorro` não resolveu.
- O sistema não sobe (`npm run dev`) por erro que não está no código da feature em andamento.
- Erro dentro de `node_modules`, do Vite, do Nest, do TypeScript ou do ESLint **como ferramenta**
  (não um erro de lint apontando uma linha do código da feature).
- `build`, `typecheck` ou testes quebrados em partes que a feature atual **não tocou**.

**Só resolveria mexendo no que é protegido**
- A correção exige alterar regra de lint, `tsconfig`, configuração de teste, hooks, CI, Docker,
  `CLAUDE.md`, skills, `lib/db/open-database.util.ts`, `lib/db/db.module.ts`, o filtro de erro
  HTTP, ou qualquer arquivo que o hook bloqueou como **"base e regras do projeto"**.
- A correção exige mexer em login/auth-forward → isso é `limites-do-mvp`.
- A "solução" seria `--no-verify`, `--force`, `--legacy-peer-deps`, desligar regra, `any`,
  `// @ts-ignore`, `eslint-disable`, apagar teste que falha.

**Banco**
- `database disk image is malformed`, migration que não aplica, migration já commitada com
  defeito, histórico de migrations em conflito que `resolver-conflito` não resolveu.
- Dados reais da pessoa em risco (ela usou o MVP para trabalho de verdade e o banco quebrou).

**Git**
- `detached HEAD`, rebase ou merge pela metade que `git merge --abort` não desfaz, `develop`
  local divergente do remoto, push recusado por histórico diferente, trabalho que "sumiu",
  branch `main` alterada nesta máquina.

**Persistência**
- O **mesmo erro** continua depois de **duas tentativas** diferentes de correção.

Erro de código **da feature que você está fazendo** (tipo errado, teste que você escreveu
falhando, lint apontando uma linha sua) **não** é caso de suporte: corrija.

## O que fazer

### 1. Parar de tentar

Não tente uma terceira abordagem, não "limpe" nada para ver se resolve, não apague
`node_modules`, banco ou branch.

### 2. Guardar o trabalho (sem risco)

- Se está numa `feature/`/`bugfix/` e há alterações: tente um commit de progresso
  (`git-commit`, mensagem `[chore](<local>): Progresso antes de parar por erro estrutural`). Se o hook
  recusar, **deixe como está** — não force.
- Não troque de branch, não faça merge, não rode `db:reset`.

### 3. Coletar os fatos

```bash
git branch --show-current
git status --short
git log --oneline -5
node -v
```

E o erro **exato** (a mensagem completa, do terminal ou do navegador), o comando que o causou,
e o que você já tentou.

### 4. Falar com a pessoa

Em português simples, sem culpa e sem alarme:

> Encontrei um problema na **estrutura do projeto** (não é algo que você fez). Para não
> arriscar o seu trabalho, parei aqui — tudo o que fizemos está guardado na branch
> `<branch>`.
>
> Esse tipo de problema exige decisão de quem administra o projeto antes de eu continuar.
> Guarde o relatório abaixo — ele resume tudo que é preciso saber pra investigar com calma,
> sem pressa.

### 5. O relatório (sempre neste formato, num bloco de código para copiar)

```text
RELATÓRIO DO PROBLEMA
Data: <dd/mm/aaaa hh:mm>
Projeto: <nome do repositório/pasta>
Branch: <branch>          Node: <versão>

O que estava sendo feito:
<uma ou duas frases, do ponto de vista da pessoa: "criar a tela de clientes">

O que aconteceu:
<o sintoma: "o sistema não abre", "npm install falha">

Erro (completo):
<mensagem exata>

Comando / ação que causou:
<comando ou clique>

O que já foi tentado:
- <tentativa 1 e resultado>
- <tentativa 2 e resultado>

Estado do trabalho:
<"commitado em feature/x (último commit: abc123 …)" ou "alterações não commitadas em: …">

Últimos commits:
<saída do git log --oneline -5>
```

### 6. Seguir com o que dá

Se houver outra parte do trabalho que **não depende** do problema, ofereça continuar. Se tudo
depende dele, diga que o próximo passo é a pessoa investigar o relatório com calma (ou chamar
quem ela confiar para ajudar) antes de seguir.

## Nunca

- Esconder o erro, dizer que resolveu sem ter resolvido, ou reduzir a gravidade.
- Contornar trava, hook ou regra para "desbloquear" a pessoa.
- Mandar a pessoa rodar comando destrutivo "para ver se resolve".
- Fingir que existe um contato de suporte externo — não existe; o relatório é para a própria
  pessoa (quem administra o projeto).
