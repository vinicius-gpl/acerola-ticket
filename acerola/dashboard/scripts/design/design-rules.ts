/**
 * As regras das skills `design-system` e `ui-standards`, em código.
 *
 * Regra que só existe em markdown é sugestão: o agente lê, entende, e na terceira tela esquece.
 * Aqui cada regra vira uma função pura sobre a lista de arquivos do projeto — sem disco, sem
 * rede —, para o teste poder montar um projeto de mentira e provar que a regra pega o que deve.
 *
 * Quem lê o disco e decide se o CI falha é o `check-design.ts`.
 */

export type ProjectFile = {
  /** Caminho relativo a `acerola/dashboard`, com `/`. */
  path: string;
  /** Conteúdo; só é lido para arquivos de texto que alguma regra inspeciona. */
  content: string;
};

export type Violation = {
  rule: string;
  file: string;
  /** O que está errado, sem número de linha: a chave da baseline não pode mudar a cada edição. */
  detail: string;
  line?: number;
};

export type Rule = {
  id: string;
  /** Uma linha, em pt-BR: aparece no relatório para quem vai corrigir. */
  description: string;
  check: (files: ProjectFile[]) => Violation[];
};

const CLIENT = 'client/src';
const LIB_COMPONENTS = `${CLIENT}/lib/components`;
const LIB_HOOKS = `${CLIENT}/lib/hooks`;
const ROUTES = `${CLIENT}/routes`;

/** Pastas permitidas em `client/src/lib` (skill `design-system` §2). */
export const LIB_FOLDERS = [
  'api',
  'auth',
  'components',
  'hooks',
  'motion',
  'navigation',
  'theme',
  'types',
  'utils',
];

/** Palavras em pt-BR que denunciam pasta de bucket ou chave de storage fora do inglês. */
const PT_STORAGE_WORDS = /(chamado|anexo|arquivo|foto|relatorio|tarefa|manutenc|computador|peca)/;

const RAW_PALETTE =
  /\b(?:text|bg|border|ring|fill|stroke|from|to|via)-(?:neutral|gray|slate|zinc|stone|red|rose|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink)-\d{2,3}\b/g;
const ARBITRARY_FONT = /\btext-\[\d+(?:\.\d+)?px\]/g;
const SIZE_RADIUS = /\brounded(?:-(?:xs|sm|md|lg|xl|2xl|3xl|\[[^\]]+\]))?(?=[\s"'`}]|$)/g;
const OFF_SCALE_SHADOW = /\bshadow(?:-(?:sm|md|lg|2xl|inner|\[[^\]]+\]))?(?=[\s"'`}]|$)/g;
const OFF_SCALE_HEIGHT = /\bh-(?:7|8|9|11|12)\b/g;
const RAW_INTERACTIVE = /<(button|input|select|textarea|table)\b/g;

function segments(path: string): string[] {
  return path.split('/');
}

function isUi(path: string): boolean {
  return path.includes('/components/ui/') || path.includes('/hooks/ui/');
}

function isStoryOrTest(path: string): boolean {
  return /\.(stories\.svelte|test\.ts|test\.svelte)$/.test(path) || path.includes('-harness.test');
}

/** Arquivo de componente próprio (genérico ou de feature), fora do CLI e fora de story/teste. */
function isOwnComponentSource(path: string): boolean {
  if (!path.endsWith('.svelte') || isUi(path) || isStoryOrTest(path)) return false;

  return path.startsWith(`${LIB_COMPONENTS}/`) || /\/routes\/.+\/components\//.test(path);
}

/** Onde regra de classe Tailwind vale: componente próprio e arquivo de rota. */
function isStyledSource(path: string): boolean {
  if (isOwnComponentSource(path)) return true;

  return path.startsWith(`${ROUTES}/`) && path.endsWith('.svelte') && !isStoryOrTest(path);
}

/** As pastas imediatas de componente: `lib/components/<x>` e `routes/**\/components/<x>`. */
export function componentFolders(files: ProjectFile[]): string[] {
  const folders = new Set<string>();

  for (const { path } of files) {
    if (isUi(path)) continue;

    const lib = path.match(new RegExp(`^(${LIB_COMPONENTS}/[^/]+)/`));
    if (lib?.[1]) folders.add(lib[1]);

    const feature = path.match(/^(client\/src\/routes\/.+?\/components\/[^/]+)\//);
    if (feature?.[1]) folders.add(feature[1]);
  }

  return [...folders].sort();
}

/** A feature de um arquivo de rota: `routes/(app)/tickets/+page.svelte` → `tickets`. */
function featureOf(path: string): string {
  return (
    path
      .slice(ROUTES.length + 1)
      .replace(/^\([^)]+\)\//, '')
      .split('/')[0] ?? ''
  );
}

/**
 * Para cada componente de `lib/components`, as features que o usam — seguindo a cadeia: se
 * `dashboard-peaking` só é importado por `dashboard-view`, e `dashboard-view` só pela rota
 * `dashboard`, os dois são do dashboard. O `+layout` da raiz conta como "app inteiro" (`*`).
 */
export function featureOwners(files: ProjectFile[]): Map<string, Set<string>> {
  const libFolders = componentFolders(files).filter((folder) => folder.startsWith(LIB_COMPONENTS));
  const importersOf = new Map<string, ProjectFile[]>();

  for (const folder of libFolders) {
    const name = segments(folder).at(-1) ?? '';
    const importPath = `components/${name}/${name}`;
    importersOf.set(
      folder,
      files.filter(
        (file) => !file.path.startsWith(`${folder}/`) && file.content.includes(importPath),
      ),
    );
  }

  const memo = new Map<string, Set<string>>();
  const resolving = new Set<string>();

  const ownersOf = (folder: string): Set<string> => {
    const cached = memo.get(folder);
    if (cached) return cached;
    /* Ciclo de import: trata como genérico para não reprovar por engano. */
    if (resolving.has(folder)) return new Set(['*']);
    resolving.add(folder);

    const owners = new Set<string>();
    for (const importer of importersOf.get(folder) ?? []) {
      if (isStoryOrTest(importer.path)) continue;
      const libOwner = libFolders.find((other) => importer.path.startsWith(`${other}/`));
      if (libOwner) {
        for (const owner of ownersOf(libOwner)) owners.add(owner);
        continue;
      }
      if (!importer.path.startsWith(`${ROUTES}/`)) {
        owners.add('*');
        continue;
      }
      const feature = featureOf(importer.path);
      owners.add(feature.startsWith('+') ? '*' : feature);
    }

    resolving.delete(folder);
    memo.set(folder, owners);

    return owners;
  };

  for (const folder of libFolders) ownersOf(folder);
  /* Sem dono nenhum (componente que ninguém importa) não é "de feature": fica de fora. */
  for (const [folder, owners] of memo)
    if (owners.size === 0 || owners.has('*')) memo.delete(folder);

  return memo;
}

function lineOf(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

/** Uma violação por classe distinta por arquivo — a baseline conta, não lista linhas. */
function classViolations(
  files: ProjectFile[],
  rule: string,
  pattern: RegExp,
  allowed: (match: string, file: ProjectFile) => boolean = () => false,
): Violation[] {
  const out: Violation[] = [];

  for (const file of files) {
    if (!isStyledSource(file.path)) continue;

    for (const match of file.content.matchAll(pattern)) {
      if (allowed(match[0], file)) continue;
      out.push({
        rule,
        file: file.path,
        detail: match[0],
        line: lineOf(file.content, match.index),
      });
    }
  }

  return out;
}

export const RULES: Rule[] = [
  {
    id: 'component-prefix',
    description: 'Todo componente próprio mora em pasta `acerola-<nome>/`.',
    check: (files) =>
      componentFolders(files)
        .filter((folder) => !segments(folder).at(-1)?.startsWith('acerola-'))
        .map((folder) => ({
          rule: 'component-prefix',
          file: folder,
          detail: 'pasta sem prefixo acerola-',
        })),
  },
  {
    id: 'component-siblings',
    description: 'Todo componente próprio tem `.stories.svelte` e `.test.ts` ao lado.',
    check: (files) => {
      const paths = new Set(files.map((file) => file.path));
      const out: Violation[] = [];

      for (const folder of componentFolders(files)) {
        const name = segments(folder).at(-1) ?? '';
        if (!paths.has(`${folder}/${name}.svelte`)) continue;
        if (!paths.has(`${folder}/${name}.stories.svelte`))
          out.push({ rule: 'component-siblings', file: folder, detail: 'sem .stories.svelte' });
        if (!paths.has(`${folder}/${name}.test.ts`))
          out.push({ rule: 'component-siblings', file: folder, detail: 'sem .test.ts' });
      }

      return out;
    },
  },
  {
    id: 'feature-component-in-lib',
    description:
      'Componente de `lib/components` usado (direta ou indiretamente) por uma feature só é de feature: mora em `routes/<feature>/components/`.',
    check: (files) =>
      [...featureOwners(files)]
        .filter(([, owners]) => owners.size === 1)
        .map(([folder, owners]) => ({
          rule: 'feature-component-in-lib',
          file: folder,
          detail: `só usado por routes/${[...owners][0]}`,
        })),
  },
  {
    id: 'hook-location',
    description: 'Hook próprio mora em `lib/hooks/use-<nome>/`; nada solto, nada sem `use-`.',
    check: (files) => {
      const entries = new Set<string>();
      for (const { path } of files) {
        const match = path.match(new RegExp(`^${LIB_HOOKS}/([^/]+)(/)?`));
        if (match?.[1]) entries.add(match[2] ? `${match[1]}/` : match[1]);
      }

      return [...entries]
        .filter((entry) => entry !== 'ui/' && !(entry.startsWith('use-') && entry.endsWith('/')))
        .map((entry) => ({
          rule: 'hook-location',
          file: `${LIB_HOOKS}/${entry.replace(/\/$/, '')}`,
          detail: entry.endsWith('/') ? 'pasta sem prefixo use-' : 'arquivo solto em lib/hooks',
        }));
    },
  },
  {
    id: 'lib-folder',
    description: `Em \`client/src/lib\` só existem: ${LIB_FOLDERS.join(', ')}.`,
    check: (files) => {
      const folders = new Set<string>();
      for (const { path } of files) {
        const match = path.match(new RegExp(`^${CLIENT}/lib/([^/]+)/`));
        if (match?.[1]) folders.add(match[1]);
      }

      return [...folders]
        .filter((folder) => !LIB_FOLDERS.includes(folder))
        .map((folder) => ({
          rule: 'lib-folder',
          file: `${CLIENT}/lib/${folder}`,
          detail: 'pasta fora do mapa',
        }));
    },
  },
  {
    id: 'ui-import-boundary',
    description: '`lib/components/ui` só é importado por componente genérico de `lib/components`.',
    check: (files) =>
      files
        .filter(
          (file) =>
            !file.path.startsWith(`${LIB_COMPONENTS}/`) && file.path.startsWith(`${CLIENT}/`),
        )
        .filter((file) => /lib\/components\/ui\//.test(file.content))
        .map((file) => ({
          rule: 'ui-import-boundary',
          file: file.path,
          detail: 'importa lib/components/ui',
        })),
  },
  {
    id: 'cross-feature-import',
    description: 'Feature não importa componente de outra feature.',
    check: (files) =>
      files
        .filter((file) => file.path.startsWith(`${ROUTES}/`))
        .flatMap((file) =>
          [...file.content.matchAll(/from\s+['"](\.\.\/)+([a-z-]+)\/components\//g)].map(
            (match) => ({
              rule: 'cross-feature-import',
              file: file.path,
              detail: `importa componente de ${match[2]}`,
            }),
          ),
        ),
  },
  {
    id: 'route-markup',
    description:
      'Rota só compõe: nada de `<button>`, `<input>`, `<select>`, `<textarea>`, `<table>` cru.',
    check: (files) =>
      files
        .filter((file) => file.path.startsWith(`${ROUTES}/`))
        .filter((file) => /(\+page|\+layout|\+error|-slot)\.svelte$/.test(file.path))
        .flatMap((file) =>
          [...file.content.matchAll(RAW_INTERACTIVE)].map((match) => ({
            rule: 'route-markup',
            file: file.path,
            detail: `<${match[1]}> na rota`,
            line: lineOf(file.content, match.index),
          })),
        ),
  },
  {
    id: 'route-height',
    description: 'A rota não define altura de controle; campo é `control-lg` no componente.',
    check: (files) =>
      classViolations(
        files.filter(
          (file) => file.path.startsWith(`${ROUTES}/`) && !/\/components\//.test(file.path),
        ),
        'route-height',
        OFF_SCALE_HEIGHT,
      ),
  },
  {
    id: 'radius-by-role',
    description:
      'Raio por papel: `rounded-surface|control|box|chip|full`, nunca `rounded-lg/xl/…`.',
    check: (files) => classViolations(files, 'radius-by-role', SIZE_RADIUS),
  },
  {
    id: 'raw-palette',
    description:
      'Cor só por token (`text-ink-*`, `bg-card`, `text-destructive`…), nunca paleta crua.',
    check: (files) => classViolations(files, 'raw-palette', RAW_PALETTE),
  },
  {
    id: 'arbitrary-font-size',
    description: 'Menor texto é `text-xs`; nada de `text-[11px]`.',
    check: (files) => classViolations(files, 'arbitrary-font-size', ARBITRARY_FONT),
  },
  {
    id: 'shadow-scale',
    description: 'Sombra só `shadow-xs` (repouso) e `shadow-xl` (flutuante).',
    check: (files) => classViolations(files, 'shadow-scale', OFF_SCALE_SHADOW),
  },
  {
    id: 'data-view-pair',
    description:
      'Lista com cartão (`*-cards-mobile`) também tem tabela (`*-table-desktop`), e vice-versa.',
    check: (files) =>
      files
        .filter((file) => isOwnComponentSource(file.path))
        .flatMap((file) => {
          const cards = file.content.includes('-cards-mobile');
          const table = file.content.includes('-table-desktop');
          if (cards === table) return [];

          return [
            { rule: 'data-view-pair', file: file.path, detail: cards ? 'só cartão' : 'só tabela' },
          ];
        }),
  },
  {
    id: 'storage-folder-language',
    description: 'Pasta de bucket e chave de storage em inglês.',
    check: (files) =>
      files
        .filter((file) => file.path.startsWith('server/src/') && file.path.endsWith('.ts'))
        .filter((file) => !file.path.endsWith('.test.ts'))
        .flatMap((file) =>
          [...file.content.matchAll(/(?:FOLDER\s*=|\|\|)\s*'([a-z-]+)'/g)]
            .filter((match) => PT_STORAGE_WORDS.test(match[1] ?? ''))
            .map((match) => ({
              rule: 'storage-folder-language',
              file: file.path,
              detail: `'${match[1]}'`,
            })),
        ),
  },
  {
    id: 'doc-file-name',
    description: 'Arquivo em `docs/` tem nome kebab-case minúsculo (conteúdo segue pt-BR).',
    check: (files) =>
      files
        .filter((file) => /(^|\/)docs\/[^/]+\.md$/.test(file.path))
        .filter((file) => !/\/docs\/[a-z0-9]+(-[a-z0-9]+)*\.md$/.test(`/${file.path}`))
        .map((file) => ({
          rule: 'doc-file-name',
          file: file.path,
          detail: 'nome fora de kebab-case',
        })),
  },
];

/** A chave que a baseline conta: muda quando o problema muda, não quando a linha anda. */
export function violationKey(violation: Violation): string {
  return `${violation.rule}|${violation.file}|${violation.detail}`;
}

export type Baseline = Record<string, number>;

export function countByKey(violations: Violation[]): Baseline {
  const counts: Baseline = {};
  for (const violation of violations) {
    const key = violationKey(violation);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

export type Comparison = {
  /** Violações a mais do que a baseline permite: é isso que reprova. */
  added: Violation[];
  /** Chaves que a baseline tinha e sumiram (ou diminuíram): dívida paga, falta atualizar. */
  fixed: string[];
};

export function compareWithBaseline(violations: Violation[], baseline: Baseline): Comparison {
  const seen: Baseline = {};
  const added: Violation[] = [];

  for (const violation of violations) {
    const key = violationKey(violation);
    seen[key] = (seen[key] ?? 0) + 1;
    if (seen[key] > (baseline[key] ?? 0)) added.push(violation);
  }

  const fixed = Object.entries(baseline)
    .filter(([key, count]) => (seen[key] ?? 0) < count)
    .map(([key]) => key);

  return { added, fixed };
}
