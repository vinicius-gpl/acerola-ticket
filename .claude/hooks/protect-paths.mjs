/**
 * A MESMA TRAVA do git (`acerola/dashboard/scripts/git/branch-guard.sh`), só que ANTES de o Claude
 * escrever — para ele não passar uma hora mexendo num arquivo que o commit vai recusar.
 *
 * Roda como hook `PreToolUse` do Claude Code:
 *  - em Edit/Write/MultiEdit/NotebookEdit: recusa arquivo de identidade (auth-forward) e de
 *    estrutura do projeto;
 *  - em Bash: recusa instalar biblioteca de login (`npm install passport`…).
 *
 * As listas são as mesmas do hook do git (`acerola/dashboard/scripts/git/protected-*.txt`): um lugar só.
 * Quem administra (`git config project.admin true`) não é barrado.
 *
 * Saída 2 = bloqueia, e o texto do stderr volta para o Claude como motivo — é ele que manda o
 * Claude seguir as skills `limites-do-mvp` e `suporte`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const LISTS_DIR = join(PROJECT_DIR, 'acerola', 'dashboard', 'scripts', 'git');

function readPatterns(file) {
  try {
    return readFileSync(join(LISTS_DIR, file), 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#'))
      .map((line) => new RegExp(line));
  } catch {
    return [];
  }
}

function isAdmin() {
  try {
    const value = execFileSync('git', ['config', '--get', 'project.admin'], {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });

    return value.trim() === 'true';
  } catch {
    return false;
  }
}

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

function toRepoPath(filePath) {
  const absolute = isAbsolute(filePath) ? filePath : resolve(PROJECT_DIR, filePath);

  return relative(PROJECT_DIR, absolute).split('\\').join('/');
}

function checkFile(filePath) {
  const path = toRepoPath(filePath);

  if (readPatterns('protected-auth.txt').some((pattern) => pattern.test(path))) {
    block(
      `BLOQUEADO: "${path}" é território do auth-forward (login e identidade), gerenciado pelo suporte. ` +
        'Não altere nem contorne. Siga a skill `limites-do-mvp`: explique à pessoa que login e usuários ' +
        'vêm do auth-forward e, se ela precisar disso, oriente a falar com o suporte (SUPORTE.md).',
    );
  }

  if (readPatterns('protected-structure.txt').some((pattern) => pattern.test(path))) {
    block(
      `BLOQUEADO: "${path}" é da base e das regras do projeto, e só o suporte altera. ` +
        'Não mude regra, configuração ou trava para fazer um erro sumir. Se o trabalho só avança mexendo ' +
        'aqui, siga a skill `suporte`: pare, prepare o relatório e oriente a pessoa a falar com o suporte.',
    );
  }
}

const INSTALL_COMMAND = /\b(npm|pnpm|yarn|npx)\s+(install|i|add)\b/;

function checkCommand(command) {
  if (!INSTALL_COMMAND.test(command)) return;

  const packages = command
    .split(/\s+/)
    .filter((token) => token !== '' && !token.startsWith('-'))
    .map((token) => token.replace(/^['"]|['"]$/g, ''))
    .map((token) => (token.lastIndexOf('@') > 0 ? token.slice(0, token.lastIndexOf('@')) : token));

  const patterns = readPatterns('protected-auth-deps.txt');
  const blocked = packages.filter((name) => patterns.some((pattern) => pattern.test(name)));
  if (blocked.length === 0) return;

  block(
    `BLOQUEADO: ${blocked.join(', ')} é biblioteca de login/autenticação, e não entra no projeto. ` +
      'A identidade vem do auth-forward, gerenciado pelo suporte. Siga a skill `limites-do-mvp`.',
  );
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  raw += chunk;
});
process.stdin.on('end', () => {
  if (isAdmin()) process.exit(0);

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const input = event?.tool_input ?? {};
  const filePath = input.file_path ?? input.notebook_path;

  if (typeof filePath === 'string') checkFile(filePath);
  if (typeof input.command === 'string') checkCommand(input.command);

  process.exit(0);
});
