#!/usr/bin/env node
/**
 * VERIFICA AS LICENÇAS das dependências — Node e Go — contra `license-policy.json`.
 *
 * É o equivalente, neste repositório, ao `cargo deny check licenses` do Rust: uma lista do que
 * é aceito, exceções com motivo escrito, e reprovação de tudo o que ninguém avaliou.
 *
 *   node .github/scripts/licenses/check-licenses.mjs            confere tudo o que estiver instalado
 *   node .github/scripts/licenses/check-licenses.mjs --strict   reprova também o que NÃO deu para conferir
 *   node .github/scripts/licenses/check-licenses.mjs --list     mostra a licença de cada dependência
 *
 * Sem `--strict`, uma parte que não dá para conferir nesta máquina (uma pasta sem
 * `node_modules`, ou o `go` não instalado) vira aviso. No CI roda com `--strict`: lá, não
 * conferir é reprovar.
 *
 * A decisão em si mora em `license-policy.mjs`; aqui só se lê disco e se chama o `go`.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  checkPackages,
  declaredLicenseOf,
  detectLicenseFromText,
  forbiddenImportsIn,
  UNKNOWN_LICENSE,
} from './license-policy.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const POLICY_PATH = join(REPO_ROOT, 'license-policy.json');

/** As pastas com `node_modules` — uma por instalação do npm. */
const NODE_ROOTS = ['acerola/dashboard', 'acerola/agent/svelte'];

/** O módulo Go, e o nome dele: os pacotes do PRÓPRIO projeto não são dependência. */
const GO_ROOT = 'acerola/agent';
const GO_OWN_MODULE = 'github.com/vinicius-gpl/acerola-ticket';
/** Versão fixa: a ferramenta que confere licença não pode mudar sozinha de um dia para o outro. */
const GO_LICENSES = 'github.com/google/go-licenses/v2@v2.0.1';
/** O agente é um programa de Windows: é para esse sistema que as dependências são lidas. */
const GO_TARGET_OS = 'windows';

/** Onde o NOSSO código mora — é nele que os `import` proibidos são procurados. */
const SOURCE_DIRS = [
  'acerola/dashboard/client/src',
  'acerola/dashboard/server/src',
  'acerola/dashboard/shared/src',
  'acerola/agent/svelte/src',
];
const SOURCE_EXTENSIONS = /\.(ts|tsx|js|mjs|cjs|svelte)$/;

const args = new Set(process.argv.slice(2));
const isStrict = args.has('--strict');
const isListing = args.has('--list');

const problems = [];
const warnings = [];

/** O que não deu para conferir: reprova no modo estrito, avisa fora dele. */
function couldNotCheck(message) {
  (isStrict ? problems : warnings).push(message);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/* ------------------------------------------------------------------ Node */

function isDirectory(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/** A licença de um pacote instalado: a declarada, ou a do arquivo LICENSE, ou "desconhecida". */
function licenseOfInstalled(packageDir, manifest) {
  const declared = declaredLicenseOf(manifest);
  if (declared) return declared;

  const licenseFile = readdirSync(packageDir).find((name) => /^(licen[sc]e|copying)(\.|$)/i.test(name));
  if (!licenseFile) return UNKNOWN_LICENSE;

  return detectLicenseFromText(readFileSync(join(packageDir, licenseFile), 'utf8'));
}

/**
 * Todos os pacotes instalados sob uma pasta `node_modules`, inclusive os aninhados.
 *
 * `seen` guarda o caminho REAL de cada pasta: os pacotes do próprio workspace aparecem como
 * atalho (symlink) e, sem isso, a mesma pasta seria percorrida duas vezes — ou para sempre.
 */
function collectNodePackages(nodeModulesDir, seen, found) {
  if (!isDirectory(nodeModulesDir)) return;

  for (const entry of readdirSync(nodeModulesDir)) {
    if (entry.startsWith('.')) continue;

    const entryDir = join(nodeModulesDir, entry);
    if (entry.startsWith('@')) {
      for (const scoped of isDirectory(entryDir) ? readdirSync(entryDir) : []) {
        visitNodePackage(join(entryDir, scoped), seen, found);
      }
      continue;
    }

    visitNodePackage(entryDir, seen, found);
  }
}

function visitNodePackage(packageDir, seen, found) {
  const manifestPath = join(packageDir, 'package.json');
  if (!existsSync(manifestPath)) return;

  const realDir = realpathSync(packageDir);
  if (seen.has(realDir)) return;
  seen.add(realDir);

  const manifest = readJson(manifestPath);
  /* Pacote `private` é nosso (os workspaces): não é dependência, mas as dele são. */
  if (manifest.name && manifest.version && !manifest.private) {
    found.set(`${manifest.name}@${manifest.version}`, {
      name: manifest.name,
      version: manifest.version,
      license: licenseOfInstalled(packageDir, manifest),
    });
  }

  collectNodePackages(join(packageDir, 'node_modules'), seen, found);
}

function nodePackagesOf(root) {
  const nodeModulesDir = join(REPO_ROOT, root, 'node_modules');
  if (!isDirectory(nodeModulesDir)) return null;

  const found = new Map();
  collectNodePackages(nodeModulesDir, new Set(), found);

  return [...found.values()];
}

/* -------------------------------------------------------------------- Go */

function hasGo() {
  try {
    execFileSync('go', ['version'], { stdio: 'ignore' });

    return true;
  } catch {
    return false;
  }
}

/**
 * As dependências Go, pela ferramenta do Google (`go-licenses`).
 *
 * A ferramenta é instalada numa pasta temporária e SÓ DEPOIS chamada com o sistema-alvo
 * trocado: com `go run` direto, o `GOOS` valeria também para compilar a própria ferramenta, e
 * no Linux do CI sairia um executável de Windows que não roda lá.
 */
function goPackages() {
  const binDir = mkdtempSync(join(tmpdir(), 'go-licenses-'));
  execFileSync('go', ['install', GO_LICENSES], {
    env: { ...process.env, GOBIN: binDir, GOFLAGS: '' },
    stdio: ['ignore', 'ignore', 'inherit'],
  });

  const binary = join(binDir, process.platform === 'win32' ? 'go-licenses.exe' : 'go-licenses');
  const csv = execFileSync(binary, ['report', './...', '--ignore', GO_OWN_MODULE], {
    cwd: join(REPO_ROOT, GO_ROOT),
    env: { ...process.env, GOOS: GO_TARGET_OS },
    encoding: 'utf8',
    /* Os avisos de "contém código que não é Go" vão para o erro padrão e não interessam aqui. */
    stdio: ['ignore', 'pipe', 'ignore'],
    maxBuffer: 16 * 1024 * 1024,
  });

  return csv
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '')
    .map((line) => {
      const [name, , license] = line.split(',');

      return { name, version: '', license: license && license !== 'Unknown' ? license : UNKNOWN_LICENSE };
    });
}

/* ------------------------------------------------------------- relatório */

function describe(dependency) {
  return dependency.version ? `${dependency.name}@${dependency.version}` : dependency.name;
}

function report(label, ecosystem, packages, policy) {
  const { refused, unused } = checkPackages(packages, policy, ecosystem);

  console.log(`  ${label}: ${packages.length} dependências, ${refused.length} recusada(s)`);

  if (isListing) {
    for (const dependency of [...packages].sort((a, b) => a.name.localeCompare(b.name))) {
      console.log(`      ${describe(dependency)}  —  ${dependency.license}`);
    }
  }

  for (const dependency of refused) {
    problems.push(
      `${label}: ${describe(dependency)} tem a licença "${dependency.license}", que não está em "allow" nem tem exceção em license-policy.json.`,
    );
  }

  return unused;
}

/* --------------------------------------------------------- imports proibidos */

function sourceFilesUnder(dir, files = []) {
  if (!isDirectory(dir)) return files;

  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (isDirectory(path)) sourceFilesUnder(path, files);
    else if (SOURCE_EXTENSIONS.test(entry)) files.push(path);
  }

  return files;
}

function checkForbiddenImports(policy) {
  const forbidden = policy.forbiddenImports ?? [];
  if (forbidden.length === 0) return;

  let files = 0;
  for (const dir of SOURCE_DIRS) {
    for (const file of sourceFilesUnder(join(REPO_ROOT, dir))) {
      files += 1;
      for (const rule of forbiddenImportsIn(readFileSync(file, 'utf8'), forbidden)) {
        problems.push(
          `${relative(REPO_ROOT, file)} importa "${rule.pattern}", que é proibido: ${rule.reason}`,
        );
      }
    }
  }

  console.log(`  Imports proibidos: ${files} arquivos conferidos`);
}

/* ------------------------------------------------------------------ main */

function main() {
  const policy = readJson(POLICY_PATH);
  /* Uma exceção só é "sem uso" se nenhuma das instalações precisou dela. */
  const unusedByEcosystem = { node: null, go: null };
  const intersect = (previous, unused) =>
    previous === null ? unused : previous.filter((item) => unused.includes(item));

  console.log('Licenças das dependências (license-policy.json)\n');

  for (const root of NODE_ROOTS) {
    const packages = nodePackagesOf(root);
    if (packages === null) {
      couldNotCheck(`Node (${root}): sem node_modules — rode "npm ci" nessa pasta para conferir.`);
      continue;
    }

    unusedByEcosystem.node = intersect(unusedByEcosystem.node, report(`Node (${root})`, 'node', packages, policy));
  }

  if (hasGo()) {
    unusedByEcosystem.go = report(`Go (${GO_ROOT})`, 'go', goPackages(), policy);
  } else {
    couldNotCheck(`Go (${GO_ROOT}): o comando "go" não está instalado — as dependências Go não foram conferidas.`);
  }

  checkForbiddenImports(policy);

  for (const unused of Object.values(unusedByEcosystem)) {
    for (const exception of unused ?? []) {
      problems.push(
        `Exceção sem uso em license-policy.json: ${exception.package} (${exception.license}). O pacote saiu ou mudou de licença — remova a exceção ou reavalie.`,
      );
    }
  }

  for (const warning of warnings) console.log(`\n  aviso: ${warning}`);

  if (problems.length === 0) {
    console.log('\n✓ Licenças: tudo dentro da política.');

    return;
  }

  console.error(`\n✗ Licenças: ${problems.length} problema(s).\n`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    '\n  Para resolver: troque a dependência, ou — depois de avaliar — registre uma exceção COM MOTIVO em license-policy.json.',
  );
  process.exitCode = 1;
}

main();
