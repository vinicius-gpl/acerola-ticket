#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  APPS,
  RULES,
  compareWithBaseline,
  countByKey,
  violationsTouching,
} from './design-rules.mjs';

/**
 * Confere o projeto contra as skills `design-system` e `ui-standards`.
 *
 *   npm run check:design              → reprova se houver violação NOVA (fora da baseline)
 *   node check-design.mjs --all       → lista tudo, inclusive a dívida já conhecida
 *   node check-design.mjs --update    → regrava a baseline (depois de corrigir dívida)
 *   node check-design.mjs --hook      → modo hook do Claude Code (lê o evento no stdin)
 *
 * POR QUE BASELINE: o projeto já nasceu com dívida (componente sem prefixo, cor crua…). Reprovar
 * tudo de uma vez travaria todo PR até a migração inteira acabar; aceitar tudo deixaria a dívida
 * crescer. A baseline congela o que existe: o que já está lá passa, o que é novo reprova, e
 * cada correção encolhe o arquivo.
 *
 * `.mjs` puro, sem `tsx` e sem dependência: roda no CI, no `pre-push` E no hook `PostToolUse`
 * do Claude Code a cada edição — por isso precisa iniciar rápido.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
/** A raiz do repositório: `.claude/hooks/design` → `.claude/hooks` → `.claude` → raiz. */
const REPO_ROOT = join(__dirname, '..', '..', '..');
const BASELINE_FILE = join(__dirname, 'design-baseline.json');

/** O que entra na varredura, relativo à raiz do repositório. */
const SCAN_ROOTS = [...APPS.map((app) => app.src), 'acerola/dashboard/server/src'];
const TEXT_FILE = /\.(svelte|ts|md)$/;
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'build', '.svelte-kit', 'coverage']);
const SCAN_ROOT_PATHS = new Set(SCAN_ROOTS.map((root) => join(REPO_ROOT, root)));

function walk(dir, out) {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEXT_FILE.test(entry)) out.push(full);
  }
}

/** Acha todo `docs/` dentro de `acerola/**`, sem redescer nas árvores já cobertas por `SCAN_ROOTS`. */
function walkDocs(dir, out) {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (!statSync(full).isDirectory() || SCAN_ROOT_PATHS.has(full)) continue;
    if (entry === 'docs') walk(full, out);
    else walkDocs(full, out);
  }
}

function loadFiles() {
  const paths = [];
  for (const root of SCAN_ROOTS) walk(join(REPO_ROOT, root), paths);
  walkDocs(join(REPO_ROOT, 'acerola'), paths);

  return [...new Set(paths)].map((full) => ({
    path: relative(REPO_ROOT, full).split(sep).join('/'),
    content: readFileSync(full, 'utf8'),
  }));
}

function loadBaseline() {
  if (!existsSync(BASELINE_FILE)) return {};

  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8'));
}

function saveBaseline(violations) {
  const counts = countByKey(violations);
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
}

function report(write, title, violations) {
  write(`\n${title}\n`);
  for (const rule of RULES) {
    const mine = violations.filter((violation) => violation.rule === rule.id);
    if (mine.length === 0) continue;

    write(`\n  ✗ ${rule.id} (${mine.length}) — ${rule.description}\n`);
    for (const violation of mine) {
      const where = violation.line ? `${violation.file}:${violation.line}` : violation.file;
      write(`      ${where}  ${violation.detail}\n`);
    }
  }
}

/** Caminho (relativo à raiz) entra na varredura e tem extensão que alguma regra olha? */
function inScope(relPath) {
  if (!TEXT_FILE.test(relPath)) return false;
  if (SCAN_ROOTS.some((root) => relPath === root || relPath.startsWith(`${root}/`))) return true;

  return relPath.startsWith('acerola/') && /(^|\/)docs\/[^/]+\.md$/.test(relPath);
}

/** Lê o evento do Claude Code no stdin e devolve o caminho do arquivo editado, relativo à raiz. */
function readHookFilePath() {
  let raw;
  try {
    raw = readFileSync(0, 'utf8');
  } catch {
    return undefined;
  }
  if (!raw.trim()) return undefined;

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return undefined;
  }

  const filePath = event?.tool_input?.file_path;
  if (typeof filePath !== 'string' || filePath === '') return undefined;

  return relative(REPO_ROOT, filePath).split(sep).join('/');
}

/** Modo hook: só paga o preço de varrer o projeto quando o arquivo editado entra na varredura. */
function runHook() {
  const relPath = readHookFilePath();
  if (relPath === undefined || !inScope(relPath)) {
    process.exitCode = 0;

    return;
  }

  const files = loadFiles();
  const violations = RULES.flatMap((rule) => rule.check(files));
  const { added } = compareWithBaseline(violations, loadBaseline());
  const touching = violationsTouching(added, relPath);

  if (touching.length === 0) {
    process.exitCode = 0;

    return;
  }

  report(
    (text) => process.stderr.write(text),
    `Design: ${touching.length} violação(ões) NOVA(S) em ${relPath}:`,
    touching,
  );
  process.stderr.write('\nCorrija agora — skill design-system/ui-standards.\n');
  process.exitCode = 2;
}

function main() {
  const args = new Set(process.argv.slice(2));

  if (args.has('--hook')) {
    runHook();

    return;
  }

  const files = loadFiles();
  const violations = RULES.flatMap((rule) => rule.check(files));

  if (args.has('--update')) {
    saveBaseline(violations);
    console.log(`Baseline regravada: ${violations.length} violações conhecidas.`);

    return;
  }

  if (args.has('--all'))
    report((text) => process.stdout.write(text), `Todas as violações (${violations.length}):`, violations);

  const { added, fixed } = compareWithBaseline(violations, loadBaseline());

  if (fixed.length > 0) {
    console.log(
      `\n✓ ${fixed.length} item(ns) da baseline foram corrigidos. Rode "npm run check:design -- --update" e commite a baseline menor.`,
    );
  }

  if (added.length === 0) {
    console.log(`\n✓ Design: nenhuma violação nova (${violations.length} conhecidas na baseline).`);

    return;
  }

  report(
    (text) => process.stdout.write(text),
    `Design: ${added.length} violação(ões) NOVA(S) — corrija antes de commitar:`,
    added,
  );
  console.log('\nRegras: skills design-system e ui-standards (.claude/skills).');
  process.exitCode = 1;
}

main();
