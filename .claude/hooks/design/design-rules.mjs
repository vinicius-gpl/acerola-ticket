/**
 * As regras das skills `design-system` e `ui-standards`, em código.
 *
 * Regra que só existe em markdown é sugestão: o agente lê, entende, e na terceira tela esquece.
 * Aqui cada regra vira uma função pura sobre a lista de arquivos do projeto — sem disco, sem
 * rede —, para o teste poder montar um projeto de mentira e provar que a regra pega o que deve.
 *
 * Cobre os dois apps Svelte do projeto (`APPS`), e é o mesmo módulo que roda no `check:design`
 * (CI, pre-push) e no hook `PostToolUse` do Claude Code — por isso é `.mjs` puro, sem `tsx` e
 * sem dependência: o hook precisa ser rápido em toda edição.
 *
 * Quem lê o disco e decide se o CI (ou o hook) reprova é o `check-design.mjs`.
 *
 * @typedef {Object} ProjectFile
 * @property {string} path - Caminho relativo à raiz do repositório, com `/`.
 * @property {string} content - Conteúdo; só é lido para arquivos de texto que alguma regra inspeciona.
 *
 * @typedef {Object} Violation
 * @property {string} rule
 * @property {string} file
 * @property {string} detail - O que está errado, sem número de linha: a chave da baseline não pode mudar a cada edição.
 * @property {number} [line]
 *
 * @typedef {Object} Rule
 * @property {string} id
 * @property {string} description - Uma linha, em pt-BR: aparece no relatório para quem vai corrigir.
 * @property {(files: ProjectFile[]) => Violation[]} check
 *
 * @typedef {Object.<string, number>} Baseline
 *
 * @typedef {Object} Comparison
 * @property {Violation[]} added - Violações a mais do que a baseline permite: é isso que reprova.
 * @property {string[]} fixed - Chaves que a baseline tinha e sumiram (ou diminuíram): dívida paga, falta atualizar.
 */

/** Os apps Svelte do projeto. Cada um segue as mesmas regras de componente, hook e rota. */
export const APPS = [
  { name: 'dashboard', src: 'acerola/dashboard/client/src' },
  { name: 'agent', src: 'acerola/agent/svelte/src' },
];

/** A pasta do server, fora dos apps Svelte (só a regra `storage-folder-language` olha aqui). */
const SERVER_SRC = 'acerola/dashboard/server/src';

/** Pastas permitidas em `<app>/lib` (skill `design-system` §2), para os dois apps. */
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

/**
 * Primitivos genéricos por natureza: não conhecem domínio (gráfico, barra, medidor, invólucro
 * de um `ui/<x>`), mas hoje têm um consumidor só. Sem esta lista a regra
 * `feature-component-in-lib` os empurraria para dentro da feature — e a segunda tela que
 * precisasse de um gráfico teria de trazê-los de volta. O nome vale com ou sem `acerola-`.
 */
export const GENERIC_BY_DESIGN = [
  'radar-chart',
  'radial-chart',
  'area-chart',
  'progress-bar',
  'usage-meter',
  /^chart-/,
  // Invólucros de `ui/<x>`: a feature não pode importar `ui/` direto, então eles moram em lib.
  'dialog',
  'table',
  'sheet',
  'skeleton',
  'popover',
  'separator',
];

/** @param {string} folder */
function isGenericByDesign(folder) {
  const name = (segments(folder).at(-1) ?? '').replace(/^acerola-/, '');

  return GENERIC_BY_DESIGN.some((entry) =>
    typeof entry === 'string' ? entry === name : entry.test(name),
  );
}

/** Palavras em pt-BR que denunciam pasta de bucket ou chave de storage fora do inglês. */
const PT_STORAGE_WORDS = /(chamado|anexo|arquivo|foto|relatorio|tarefa|manutenc|computador|peca)/;

const RAW_PALETTE =
  /\b(?:text|bg|border|ring|fill|stroke|from|to|via)-(?:neutral|gray|slate|zinc|stone|red|rose|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink)-\d{2,3}\b/g;
const ARBITRARY_FONT = /\btext-\[\d+(?:\.\d+)?px\]/g;
const SIZE_RADIUS = /\brounded(?:-(?:xs|sm|md|lg|xl|2xl|3xl|\[[^\]]+\]))?(?=[\s"'`}]|$)/g;
const OFF_SCALE_SHADOW = /\bshadow(?:-(?:sm|md|lg|2xl|inner|\[[^\]]+\]))?(?=[\s"'`}]|$)/g;
const OFF_SCALE_HEIGHT = /\bh-(?:7|8|9|11|12)\b/g;
const RAW_INTERACTIVE = /<(button|input|select|textarea|table)\b/g;

/** @param {string} path */
function segments(path) {
  return path.split('/');
}

/** O app que contém o caminho, ou `undefined` se ele não mora em nenhum (ex.: `server/`). */
/** @param {string} path @returns {{name: string, src: string} | undefined} */
function appOf(path) {
  return APPS.find((app) => path === app.src || path.startsWith(`${app.src}/`));
}

/** @param {{src: string}} app */
function libComponents(app) {
  return `${app.src}/lib/components`;
}

/** @param {{src: string}} app */
function libHooks(app) {
  return `${app.src}/lib/hooks`;
}

/** @param {{src: string}} app */
function routesDir(app) {
  return `${app.src}/routes`;
}

/** @param {string} path */
function isUi(path) {
  return path.includes('/components/ui/') || path.includes('/hooks/ui/');
}

/** @param {string} path */
function isStoryOrTest(path) {
  return /\.(stories\.svelte|test\.ts|test\.svelte)$/.test(path) || path.includes('-harness.test');
}

/**
 * Arquivo de rota: qualquer `.svelte` dentro de `<app>/routes`, fora de `/components/`. O
 * dashboard usa `+page.svelte`/`+layout.svelte`/`-slot.svelte`; o agent usa `<tela>/<tela>.svelte`
 * — os dois contam.
 * @param {string} path
 */
function isRouteFile(path) {
  const app = appOf(path);
  if (!app) return false;
  if (!path.startsWith(`${routesDir(app)}/`) || !path.endsWith('.svelte')) return false;

  return !path.includes('/components/');
}

/** Arquivo de componente próprio (genérico ou de feature), fora do CLI e fora de story/teste. */
/** @param {string} path */
function isOwnComponentSource(path) {
  if (!path.endsWith('.svelte') || isUi(path) || isStoryOrTest(path)) return false;
  const app = appOf(path);
  if (!app) return false;
  if (path.startsWith(`${libComponents(app)}/`)) return true;

  return new RegExp(`^${routesDir(app)}/.+/components/`).test(path);
}

/** Onde regra de classe Tailwind vale: componente próprio e arquivo de rota. */
/** @param {string} path */
function isStyledSource(path) {
  if (isOwnComponentSource(path)) return true;

  return isRouteFile(path) && !isStoryOrTest(path);
}

/** As pastas imediatas de componente: `lib/components/<x>` e `routes/**\/components/<x>`, nos dois apps. */
/** @param {ProjectFile[]} files @returns {string[]} */
export function componentFolders(files) {
  const folders = new Set();

  for (const { path } of files) {
    if (isUi(path)) continue;
    const app = appOf(path);
    if (!app) continue;

    const lib = path.match(new RegExp(`^(${libComponents(app)}/[^/]+)/`));
    if (lib?.[1]) folders.add(lib[1]);

    const feature = path.match(new RegExp(`^(${routesDir(app)}/.+?/components/[^/]+)/`));
    if (feature?.[1]) folders.add(feature[1]);
  }

  return [...folders].sort();
}

/**
 * A feature de um arquivo de rota: `routes/(app)/tickets/+page.svelte` → `tickets`;
 * `routes/dashboard/dashboard.svelte` (agent, sem grupo) → `dashboard`. O grupo `(app)/` some
 * antes de olhar o primeiro segmento; `+layout`/`+error`, ou um `.svelte` direto na raiz de
 * `routes` (sem subpasta), contam como "app inteiro" (`*`).
 * @param {string} path
 */
function featureOf(path) {
  const app = appOf(path);
  if (!app) return '';

  const rest = path.slice(routesDir(app).length + 1).replace(/^\([^)]+\)\//, '');
  const parts = rest.split('/');
  if (parts.length <= 1) return '*';

  return parts[0].startsWith('+') ? '*' : parts[0];
}

/**
 * Para cada componente de `lib/components`, as features que o usam — seguindo a cadeia: se
 * `dashboard-peaking` só é importado por `dashboard-view`, e `dashboard-view` só pela rota
 * `dashboard`, os dois são do dashboard. O `+layout` da raiz conta como "app inteiro" (`*`).
 * Só compara arquivos do MESMO app — um `acerola-button` do agent nunca é "dono" de um import
 * do dashboard, e vice-versa.
 * @param {ProjectFile[]} files @returns {Map<string, Set<string>>}
 */
export function featureOwners(files) {
  const libFolders = componentFolders(files).filter((folder) => {
    const app = appOf(folder);

    return app && folder.startsWith(`${libComponents(app)}/`);
  });
  const importersOf = new Map();

  for (const folder of libFolders) {
    const app = appOf(folder);
    const name = segments(folder).at(-1) ?? '';
    const importPath = `components/${name}/${name}`;
    importersOf.set(
      folder,
      files.filter(
        (file) =>
          appOf(file.path) === app &&
          !file.path.startsWith(`${folder}/`) &&
          file.content.includes(importPath),
      ),
    );
  }

  const memo = new Map();
  const resolving = new Set();

  const ownersOf = (folder) => {
    const cached = memo.get(folder);
    if (cached) return cached;
    /* Ciclo de import: trata como genérico para não reprovar por engano. */
    if (resolving.has(folder)) return new Set(['*']);
    resolving.add(folder);

    const owners = new Set();
    const app = appOf(folder);
    for (const importer of importersOf.get(folder) ?? []) {
      if (isStoryOrTest(importer.path)) continue;
      const libOwner = libFolders.find((other) => importer.path.startsWith(`${other}/`));
      if (libOwner) {
        for (const owner of ownersOf(libOwner)) owners.add(owner);
        continue;
      }
      if (!importer.path.startsWith(`${routesDir(app)}/`)) {
        owners.add('*');
        continue;
      }
      owners.add(featureOf(importer.path));
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

/** @param {string} content @param {number} index */
function lineOf(content, index) {
  return content.slice(0, index).split('\n').length;
}

/** Uma violação por classe distinta por arquivo — a baseline conta, não lista linhas. */
/**
 * @param {ProjectFile[]} files
 * @param {string} rule
 * @param {RegExp} pattern
 * @param {(match: string, file: ProjectFile) => boolean} [allowed]
 * @returns {Violation[]}
 */
function classViolations(files, rule, pattern, allowed = () => false) {
  const out = [];

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

/** @type {Rule[]} */
export const RULES = [
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
      const out = [];

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
        .filter(([folder, owners]) => owners.size === 1 && !isGenericByDesign(folder))
        .map(([folder, owners]) => ({
          rule: 'feature-component-in-lib',
          file: folder,
          detail: `só usado por routes/${[...owners][0]}`,
        })),
  },
  {
    id: 'hook-location',
    description: 'Hook próprio mora em `lib/hooks/use-<nome>/`; nada solto, nada sem `use-`.',
    check: (files) =>
      APPS.flatMap((app) => {
        const entries = new Set();
        for (const { path } of files) {
          const match = path.match(new RegExp(`^${libHooks(app)}/([^/]+)(/)?`));
          if (match?.[1]) entries.add(match[2] ? `${match[1]}/` : match[1]);
        }

        return [...entries]
          .filter((entry) => entry !== 'ui/' && !(entry.startsWith('use-') && entry.endsWith('/')))
          .map((entry) => ({
            rule: 'hook-location',
            file: `${libHooks(app)}/${entry.replace(/\/$/, '')}`,
            detail: entry.endsWith('/') ? 'pasta sem prefixo use-' : 'arquivo solto em lib/hooks',
          }));
      }),
  },
  {
    id: 'lib-folder',
    description: `Em \`<app>/lib\` só existem: ${LIB_FOLDERS.join(', ')}.`,
    check: (files) =>
      APPS.flatMap((app) => {
        const folders = new Set();
        for (const { path } of files) {
          const match = path.match(new RegExp(`^${app.src}/lib/([^/]+)/`));
          if (match?.[1]) folders.add(match[1]);
        }

        return [...folders]
          .filter((folder) => !LIB_FOLDERS.includes(folder))
          .map((folder) => ({
            rule: 'lib-folder',
            file: `${app.src}/lib/${folder}`,
            detail: 'pasta fora do mapa',
          }));
      }),
  },
  {
    id: 'ui-import-boundary',
    description: '`lib/components/ui` só é importado por componente genérico de `lib/components`.',
    check: (files) =>
      files
        .filter((file) => {
          const app = appOf(file.path);

          return app && !file.path.startsWith(`${libComponents(app)}/`);
        })
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
        .filter((file) => {
          const app = appOf(file.path);

          return app && file.path.startsWith(`${routesDir(app)}/`);
        })
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
        .filter((file) => isRouteFile(file.path))
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
        files.filter((file) => isRouteFile(file.path)),
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
    /* A única exceção da skill `ui-standards` §3.3: a gaveta de baixo do celular, que é o
       `ResponsiveDialogContent`, usa `shadow-2xl`. */
    check: (files) =>
      classViolations(
        files,
        'shadow-scale',
        OFF_SCALE_SHADOW,
        (match, file) =>
          match === 'shadow-2xl' && file.path.includes('/acerola-responsive-dialog-content/'),
      ),
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
        .filter((file) => file.path.startsWith(`${SERVER_SRC}/`) && file.path.endsWith('.ts'))
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
/** @param {Violation} violation */
export function violationKey(violation) {
  return `${violation.rule}|${violation.file}|${violation.detail}`;
}

/** @param {Violation[]} violations @returns {Baseline} */
export function countByKey(violations) {
  const counts = {};
  for (const violation of violations) {
    const key = violationKey(violation);
    counts[key] = (counts[key] ?? 0) + 1;
  }

  return counts;
}

/** @param {Violation[]} violations @param {Baseline} baseline @returns {Comparison} */
export function compareWithBaseline(violations, baseline) {
  const seen = {};
  const added = [];

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

/**
 * As violações que tocam um arquivo editado: as dele mesmo, e as da pasta de componente onde
 * ele mora (a violação de `component-prefix`/`component-siblings` é registrada na PASTA, não no
 * arquivo — editar `acerola-x.svelte` precisa acusar a violação de `acerola-x/`).
 * @param {Violation[]} violations @param {string} path @returns {Violation[]}
 */
export function violationsTouching(violations, path) {
  return violations.filter((violation) => path === violation.file || path.startsWith(`${violation.file}/`));
}
