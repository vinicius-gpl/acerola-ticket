import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import {
  type Baseline,
  type ProjectFile,
  type Violation,
  RULES,
  compareWithBaseline,
  countByKey,
} from './design-rules';

/**
 * Confere o projeto contra as skills `design-system` e `ui-standards`.
 *
 *   npm run check:design            → reprova se houver violação NOVA (fora da baseline)
 *   npm run check:design -- --all   → lista tudo, inclusive a dívida já conhecida
 *   npm run check:design -- --update → regrava a baseline (depois de corrigir dívida)
 *
 * POR QUE BASELINE: o projeto já nasceu com dívida (componente sem prefixo, cor crua…). Reprovar
 * tudo de uma vez travaria todo PR até a migração inteira acabar; aceitar tudo deixaria a dívida
 * crescer. A baseline congela o que existe: o que já está lá passa, o que é novo reprova, e
 * cada correção encolhe o arquivo.
 */

const DASHBOARD = join(__dirname, '..', '..');
const BASELINE_FILE = join(__dirname, 'design-baseline.json');

/** O que entra na varredura, relativo a `acerola/dashboard`. */
const ROOTS = ['client/src', 'server/src', '../agent/docs'];
const TEXT_FILE = /\.(svelte|ts|md)$/;
const SKIPPED_DIRS = new Set(['node_modules', 'dist', 'build', '.svelte-kit', 'coverage']);

function walk(dir: string, out: string[]): void {
  if (!existsSync(dir)) return;

  for (const entry of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (TEXT_FILE.test(entry)) out.push(full);
  }
}

function loadFiles(): ProjectFile[] {
  const paths: string[] = [];
  for (const root of ROOTS) walk(join(DASHBOARD, root), paths);

  return paths.map((full) => ({
    path: relative(DASHBOARD, full).split(sep).join('/'),
    content: readFileSync(full, 'utf8'),
  }));
}

function loadBaseline(): Baseline {
  if (!existsSync(BASELINE_FILE)) return {};

  return JSON.parse(readFileSync(BASELINE_FILE, 'utf8')) as Baseline;
}

function saveBaseline(violations: Violation[]): void {
  const counts = countByKey(violations);
  const sorted = Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(BASELINE_FILE, `${JSON.stringify(sorted, null, 2)}\n`);
}

function report(title: string, violations: Violation[]): void {
  console.log(`\n${title}`);
  for (const rule of RULES) {
    const mine = violations.filter((violation) => violation.rule === rule.id);
    if (mine.length === 0) continue;

    console.log(`\n  ✗ ${rule.id} (${mine.length}) — ${rule.description}`);
    for (const violation of mine) {
      const where = violation.line ? `${violation.file}:${violation.line}` : violation.file;
      console.log(`      ${where}  ${violation.detail}`);
    }
  }
}

function main(): void {
  const args = new Set(process.argv.slice(2));
  const files = loadFiles();
  const violations = RULES.flatMap((rule) => rule.check(files));

  if (args.has('--update')) {
    saveBaseline(violations);
    console.log(`Baseline regravada: ${violations.length} violações conhecidas.`);

    return;
  }

  if (args.has('--all')) report(`Todas as violações (${violations.length}):`, violations);

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

  report(`Design: ${added.length} violação(ões) NOVA(S) — corrija antes de commitar:`, added);
  console.log('\nRegras: skills design-system e ui-standards (.claude/skills).');
  process.exitCode = 1;
}

main();
