#!/usr/bin/env sh
#
# A TRAVA DO PROJETO — CONTRIBUTING §12 e §17.
#
# Roda nos hooks do git (pre-commit, pre-merge-commit, pre-push), então vale para todo mundo:
# terminal, Claude e Tower. Ela recusa:
#
#   main        → commit, merge e envio. A main é de quem administra.
#   develop     → commit direto. Ela só recebe feature pronta, por merge.
#   identidade  → mexer em login/auth-forward (protected-auth.txt) ou instalar biblioteca de
#                 login (protected-auth-deps.txt). A identidade vem do auth-forward.
#   estrutura   → mexer nas regras e na base do projeto (protected-structure.txt). Erro que
#                 exige mexer aqui é caso de suporte, não de remendo.
#
# Quem administra libera a própria máquina UMA vez, e só ela:
#
#   git config project.admin true
#
# A configuração fica no `.git/config` daquele clone e não é versionada — por isso não vaza
# para a máquina de mais ninguém.
#
# As mensagens são para quem NÃO programa: dizem o que aconteceu e o que fazer, sem jargão.

action="$1"

if [ "$(git config --get project.admin 2>/dev/null)" = "true" ]; then
  exit 0
fi

here=$(dirname "$0")
branch=$(git symbolic-ref --quiet --short HEAD 2>/dev/null)
git_dir=$(git rev-parse --git-dir 2>/dev/null)

refuse() {
  printf '\n' >&2
  printf '  ✋ %s\n' "$1" >&2
  printf '\n' >&2
  printf '  %s\n' "$2" >&2
  printf '\n' >&2
  printf '  Nada foi perdido: suas alterações continuam aqui.\n' >&2
  printf '\n' >&2
  exit 1
}

# Lista de padrões sem comentário nem linha vazia (linha vazia casaria com tudo).
patterns() {
  grep -vE '^[[:space:]]*(#|$)' "$1"
}

# Arquivos deste commit que casam com uma lista de padrões.
staged_matching() {
  list=$(mktemp)
  patterns "$1" > "$list"
  git diff --cached --name-only --diff-filter=ACMRD | grep -E -f "$list"
  rm -f "$list"
}

# Pacotes ADICIONADOS em algum package.json deste commit que casam com a lista de login.
staged_auth_dependencies() {
  list=$(mktemp)
  patterns "$here/protected-auth-deps.txt" > "$list"
  git diff --cached -U0 -- 'package.json' '*/package.json' \
    | grep -E '^\+[[:space:]]*"[^"]+"[[:space:]]*:' \
    | sed -E 's/^\+[[:space:]]*"([^"]+)".*/\1/' \
    | grep -E -f "$list"
  rm -f "$list"
}

check_protected_changes() {
  # Concluir um merge traz o que OUTRAS pessoas (inclusive quem administra) já juntaram na
  # develop. Essas mudanças foram aceitas lá; recusá-las aqui travaria a feature de todo mundo.
  [ -f "$git_dir/MERGE_HEAD" ] && return 0

  auth_files=$(staged_matching "$here/protected-auth.txt")
  if [ -n "$auth_files" ]; then
    refuse \
      "Login e identidade são feitos pelo auth-forward, que é gerenciado pelo suporte. Estes arquivos não podem ser alterados: $(echo "$auth_files" | tr '\n' ' ')" \
      'Se o sistema precisa de algo sobre login ou usuários, fale com o suporte (veja SUPORTE.md).'
  fi

  auth_deps=$(staged_auth_dependencies)
  if [ -n "$auth_deps" ]; then
    refuse \
      "Bibliotecas de login não entram no projeto: $(echo "$auth_deps" | tr '\n' ' ')" \
      'A identidade vem do auth-forward, gerenciado pelo suporte (veja SUPORTE.md).'
  fi

  structure_files=$(staged_matching "$here/protected-structure.txt")
  if [ -n "$structure_files" ]; then
    refuse \
      "Estes arquivos são a base e as regras do projeto, e só o suporte altera: $(echo "$structure_files" | tr '\n' ' ')" \
      'Se foi para resolver um erro, pare e fale com o suporte (veja SUPORTE.md). Mudar a regra esconde o erro, não resolve.'
  fi
}

case "$action" in
  commit)
    if [ "$branch" = "main" ]; then
      refuse \
        'A branch "main" é protegida. Ninguém salva alterações direto nela.' \
        'Peça ao Claude: "começa uma feature de <o que você está fazendo>". Ele cria a branch certa e leva as alterações junto.'
    fi

    # Concluir um merge em andamento é permitido: é o merge da feature chegando.
    if [ "$branch" = "develop" ] && [ ! -f "$git_dir/MERGE_HEAD" ]; then
      refuse \
        'Na branch "develop" só entram funcionalidades prontas, por merge.' \
        'Peça ao Claude: "começa uma feature de <o que você está fazendo>". Ele cria a branch certa e leva as alterações junto.'
    fi

    check_protected_changes
    ;;

  merge)
    if [ "$branch" = "main" ]; then
      refuse \
        'Juntar alterações na "main" é tarefa de quem administra o projeto.' \
        'As funcionalidades terminam na "develop". Peça ao Claude: "terminei, pode juntar na develop".'
    fi
    ;;

  push)
    # O git entrega uma linha por referência enviada: <local> <sha> <remota> <sha>.
    while read -r _local_ref _local_sha remote_ref _remote_sha; do
      if [ "$remote_ref" = "refs/heads/main" ]; then
        refuse \
          'Enviar para a "main" é tarefa de quem administra o projeto.' \
          'Envie a "develop" ou a sua branch de feature. Peça ao Claude: "envia a develop".'
      fi
    done
    ;;
esac

exit 0
