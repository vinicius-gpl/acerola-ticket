---
name: git-fluxo
description: A REGRA DE TRABALHO COM GIT, obrigatória em toda mudança de código. Todo pedido de mudança nasce numa branch feature/ (ou bugfix/) criada a partir da develop; o trabalho é commitado nela; no fim a develop é trazida para a branch, o sistema é conferido e mostrado, e SÓ com o OK explícito da pessoa a feature entra na develop com merge --no-ff e é enviada. A main nunca é tocada. Use sempre que a pessoa pedir qualquer alteração no sistema ("quero", "muda", "corrige", "adiciona"), disser que terminou ("pronto", "funcionou", "pode juntar"), ou pedir para enviar ao GitHub.
---

# Fluxo de trabalho com git

Esta skill é **regra**, não sugestão. Ela vale para toda mudança de código, pequena ou grande.
A pessoa é leiga: **você conduz o git inteiro**, e fala com ela sobre o sistema, não sobre git.

Tudo é compatível com o Git-Flow do **Tower**, que está instalado nas máquinas: mesmos nomes
de branch, mesmos merges. Se a pessoa usar o Tower em algum momento, o que ela vê lá bate com o
que você fez.

## As três regras que nunca quebram

1. **A `main` não é tocada.** Não faça checkout, commit, merge, rebase nem push nela. Ela é de
   quem administra o projeto — e o git recusa (trava em `template/scripts/git/branch-guard.sh`).
   Release e hotfix também são dessa pessoa: se pedirem, explique que é com quem administra.
2. **Na `develop`, nada de commit direto.** Ela só recebe feature pronta, por
   `git merge --no-ff`.
3. **Sem o OK explícito da pessoa, não há merge na develop.** "OK", "funcionou", "pode juntar",
   "sim" valem. Silêncio, "acho que sim", "depois vejo" ou mudar de assunto **não** valem.

## Fase 0 — Preparar (primeira vez na máquina)

```bash
git rev-parse --is-inside-work-tree
git config --local --get gitflow.branch.develop
git branch --list develop
git remote
```

- Sem `gitflow.branch.develop`: rode `cd template && npm run prepare` (configura o Git-Flow do
  Tower e o template de commit).
- Sem branch `develop` local:
  - se existe `origin/develop`: `git switch develop` (cria rastreando o remoto);
  - se não existe em lugar nenhum: `git switch -c develop main`, e com OK da pessoa
    `git push -u origin develop`. Isso é criar a develop, não mexer na main.

## Fase 1 — Começar (a pessoa pediu uma mudança)

Faça isto **antes de editar qualquer arquivo**.

```bash
git status --short
git branch --show-current
```

### Já está numa `feature/` ou `bugfix/`?

- O pedido é **continuação** da mesma funcionalidade → siga nela.
- É **outra coisa** → pergunte, em uma frase: "Você ainda está com *<o que a branch faz>* aberto.
  Quer terminar aquilo primeiro, ou deixo salvo e começo o novo?" Se for para deixar, commite o
  progresso (`git-commit`) e siga abaixo.

### Está na `develop` (ou na `main`)?

1. Se houver alterações não salvas, elas vão junto para a branch nova — `git switch -c` leva
   tudo. Não descarte nada.
2. Atualize a develop local com o remoto, se houver remoto:
   ```bash
   git pull --ff-only                 # se você está NA develop
   git fetch origin develop:develop   # se está em outra branch (atualiza sem trocar)
   ```
   Se falhar, a develop local tem algo que o remoto não tem: **pare** e explique para a
   pessoa; não force.
3. Crie a branch **sempre a partir da develop**:
   ```bash
   git switch -c feature/<nome> develop   # funcionalidade nova ou mudança
   git switch -c bugfix/<nome> develop    # algo que estava funcionando e quebrou
   ```
   Se o git recusar a troca por causa das alterações não salvas, commite-as primeiro numa
   branch temporária a partir de onde estão (`git switch -c feature/<nome>`) e traga a develop
   para ela (`git merge develop`) — nunca descarte.
   `<nome>` em **inglês**, kebab-case, curto, do resultado: `customer-list`,
   `task-due-date`, `fix-empty-title-error` → `bugfix/empty-title-error`.
4. Diga à pessoa, sem jargão: *"Criei um espaço de trabalho separado para isso
   (`feature/customer-list`). Nada do que eu fizer aqui afeta a versão principal até você
   aprovar."*

**Uma feature por branch.** Pedido grande? Quebre em partes que funcionam sozinhas, uma branch
de cada vez.

## Fase 2 — Trabalhar

- Siga as skills do pedido (`nova-feature`, `componente-ui`, `banco-de-dados`…).
- **Commite a cada etapa que funciona** (`git-commit`), na própria branch. É o ponto de
  salvamento: se algo der errado depois, dá para voltar.
- Nunca `--no-verify`. Se o hook recusar, corrija.

## Fase 3 — Terminar (a pessoa diz que acabou, ou você terminou o pedido)

### 3.1 Tudo salvo

```bash
git status --short
```

Commite o que faltar (`git-commit`).

### 3.2 Trazer a develop para a branch — ANTES de pedir o OK

Outras pessoas podem ter juntado coisas na develop enquanto você trabalhava. Traga agora, para
que o que a pessoa for testar já seja o resultado final:

```bash
git fetch origin              # se houver remoto
git switch develop
git pull --ff-only            # se houver remoto
git switch feature/<nome>
git merge develop
```

- **Sem conflito** → siga.
- **Conflito** → skill `resolver-conflito`. Só volte aqui com o merge concluído e commitado.

### 3.3 Conferir

Skill `verificar` inteira. Vermelho → corrija na branch, commite, repita.

### 3.4 Mostrar e pedir o OK

1. `npm run seed:all` e `npm run dev` (em segundo plano).
2. Conte à pessoa, em linguagem de tela:
   - o que mudou ("agora a tela **Clientes** tem um filtro por cidade");
   - **o passo a passo para ela conferir**: endereço, onde clicar, o que deve aparecer —
     incluindo um caminho de erro ("tente salvar sem nome: deve aparecer *Informe o nome*");
   - se a develop trouxe mudanças de outras pessoas, avise que elas também estão ali.
3. Faça a pergunta **fechada**, sempre com estas palavras:

   > **Está funcionando do jeito que você queria?** Se sim, eu junto na versão de
   > desenvolvimento (develop) e envio para o GitHub. Se não, me diz o que ajustar.

4. **Espere a resposta.** Não siga para a Fase 4 na mesma mensagem.

- Resposta com problema ou ajuste → volte à Fase 2 **na mesma branch**, e depois refaça a
  Fase 3 desde o 3.1.
- Resposta ambígua → pergunte de novo, de forma direta.

## Fase 4 — Juntar na develop (só depois do OK)

```bash
git switch develop
git pull --ff-only                         # se houver remoto
git merge --no-ff feature/<nome> -m "Merge branch 'feature/<nome>' into develop"
```

- O Claude Code vai pedir confirmação para o `git merge --no-ff`: é a segunda trava, de
  propósito. Diga à pessoa: *"Vai aparecer um pedido de confirmação — é o merge que você
  aprovou."*
- **Conflito aqui** (alguém juntou algo entre o 3.2 e agora): **não resolva na develop.**
  ```bash
  git merge --abort
  git switch feature/<nome>
  ```
  e volte ao 3.2. Explique: *"Alguém juntou uma mudança agora há pouco; vou trazer para a sua
  branch e te mostrar de novo."* Se o que chegou mexe no que ela testou, peça o OK de novo.

Enviar e limpar:

```bash
git push origin develop                    # pede confirmação — é publicar
git branch -d feature/<nome>
git push origin --delete feature/<nome>    # só se a branch tinha sido enviada
```

Sem remoto configurado: pare no merge e diga que está salvo só nesta máquina.

Para a pessoa: *"Pronto: <o que ela ganhou> já está na develop. Quem administra o projeto
decide quando isso vai para a versão oficial (main)."*

## Enviar a branch antes de terminar (backup)

Se a pessoa pedir para "salvar no GitHub" no meio do trabalho: `git push -u origin
feature/<nome>` (pede confirmação). Isso **não** junta nada na develop.

## Nunca

- Qualquer operação na `main`. Se o hook disser "✋ … main", pare e siga esta skill; não
  procure contorno.
- `git push --force`, `git reset --hard`, `git clean`, `git rebase` em branch já enviada,
  apagar branch não mergeada — sem a pessoa entender e confirmar.
- Merge na develop sem o OK da Fase 3.4, ou sem `--no-ff`.
- Resolver conflito na develop.
- `git config project.admin` — essa chave é de quem administra, na máquina dela.
