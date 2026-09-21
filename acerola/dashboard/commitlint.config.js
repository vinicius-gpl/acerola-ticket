/**
 * Padrão de commit do projeto:  [tipo](local): Mensagem
 *
 * O commitlint padrão espera Conventional Commits (`tipo(escopo): msg`), então o
 * cabeçalho é reinterpretado aqui por um parser próprio. Sem isto, TODO commit
 * no nosso formato seria rejeitado como "cabeçalho inválido".
 *
 * Quem escreve o commit, na prática, é o Claude — pela skill `git-commit`. Esta
 * configuração é a trava que não depende de ninguém lembrar da skill.
 */

/** @type {import('@commitlint/types').UserConfig} */
export default {
  parserPreset: {
    parserOpts: {
      // [feat](backend): Mensagem
      headerPattern: /^\[(\w+)\]\(([a-z-]+)\): (.+)$/,
      headerCorrespondence: ['type', 'scope', 'subject'],
    },
  },

  /**
   * Commit de MERGE não segue o formato, e não deve seguir: a mensagem é gerada pelo git, o
   * Gitflow exige um a cada `feature`, `release` ou `hotfix` fechada, e o `--no-ff` existe
   * justamente para que ele apareça no histórico.
   *
   * Sem esta exceção, fechar uma feature só sai com `--no-verify` — e `--no-verify` não
   * desliga só esta regra: desliga o `pre-commit` inteiro junto, lint incluído. Uma trava
   * que obriga a contorná-la deixa de ser uma trava.
   */
  ignores: [(message) => /^Merge (branch|remote-tracking branch|pull request|tag) /.test(message)],

  rules: {
    'type-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'refactor', 'test', 'docs', 'style', 'perf', 'build', 'ci', 'chore'],
    ],

    'scope-empty': [2, 'never'],
    'scope-enum': [
      2,
      'always',
      ['backend', 'web', 'db', 'contracts', 'docker', 'ci', 'docs', 'deps', 'claude', 'agent'],
    ],

    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    // Desligado de propósito: a mensagem começa com maiúscula e pode conter
    // siglas (LTS, MVP, API), que qualquer regra de caixa reprovaria.
    'subject-case': [0],

    'header-max-length': [2, 'always', 100],
  },
};
