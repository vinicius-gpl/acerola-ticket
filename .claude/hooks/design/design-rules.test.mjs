import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { RULES, compareWithBaseline, countByKey, violationsTouching } from './design-rules.mjs';

/** @param {string} ruleId @param {import('./design-rules.mjs').ProjectFile[]} files */
function run(ruleId, files) {
  const rule = RULES.find((candidate) => candidate.id === ruleId);
  assert.ok(rule, `unknown rule ${ruleId}`);

  return rule.check(files).map((violation) => `${violation.file} ${violation.detail}`);
}

/** @param {string} path @param {string} [content] */
function file(path, content = '') {
  return { path, content };
}

const DASHBOARD_LIB = 'acerola/dashboard/client/src/lib/components';
const DASHBOARD_HOOKS = 'acerola/dashboard/client/src/lib/hooks';
const DASHBOARD_ROUTES = 'acerola/dashboard/client/src/routes';
const AGENT_LIB = 'acerola/agent/svelte/src/lib/components';
const AGENT_ROUTES = 'acerola/agent/svelte/src/routes';

describe('component-prefix', () => {
  // feliz
  it('accepts acerola-* folders in lib and in feature routes, in both apps', () => {
    const files = [
      file(`${DASHBOARD_LIB}/acerola-button/acerola-button.svelte`),
      file(
        `${DASHBOARD_ROUTES}/(app)/tickets/components/acerola-ticket-card/acerola-ticket-card.svelte`,
      ),
      file(`${DASHBOARD_LIB}/ui/button/button.svelte`),
      file(`${AGENT_LIB}/acerola-badge/acerola-badge.svelte`),
      file(`${AGENT_LIB}/ui/badge/badge.svelte`),
    ];

    assert.deepEqual(run('component-prefix', files), []);
  });

  // triste
  it('flags folders without the prefix in either app', () => {
    const files = [
      file(`${DASHBOARD_LIB}/text-field/text-field.svelte`),
      file(`${DASHBOARD_ROUTES}/(app)/dashboard/components/maintenance-log/maintenance-log.svelte`),
      file(`${AGENT_LIB}/badge/badge.svelte`),
    ];

    assert.equal(run('component-prefix', files).length, 3);
  });
});

describe('feature-component-in-lib', () => {
  // triste
  it('follows the import chain to the single feature that owns it', () => {
    const files = [
      file(
        `${DASHBOARD_LIB}/acerola-dashboard-view/acerola-dashboard-view.svelte`,
        `import X from '$lib/components/acerola-peaking/acerola-peaking.svelte';`,
      ),
      file(`${DASHBOARD_LIB}/acerola-peaking/acerola-peaking.svelte`),
      file(
        `${DASHBOARD_ROUTES}/(app)/dashboard/+page.svelte`,
        `import V from '$lib/components/acerola-dashboard-view/acerola-dashboard-view.svelte';`,
      ),
    ];

    assert.deepEqual(run('feature-component-in-lib', files).sort(), [
      `${DASHBOARD_LIB}/acerola-dashboard-view só usado por routes/dashboard`,
      `${DASHBOARD_LIB}/acerola-peaking só usado por routes/dashboard`,
    ]);
  });

  // feliz
  it('keeps components used by two features or by the root layout', () => {
    const files = [
      file(`${DASHBOARD_LIB}/acerola-button/acerola-button.svelte`),
      file(`${DASHBOARD_LIB}/acerola-shell/acerola-shell.svelte`),
      file(
        `${DASHBOARD_ROUTES}/(app)/tickets/+page.svelte`,
        `components/acerola-button/acerola-button`,
      ),
      file(
        `${DASHBOARD_ROUTES}/(app)/parts/+page.svelte`,
        `components/acerola-button/acerola-button`,
      ),
      file(`${DASHBOARD_ROUTES}/+layout.svelte`, `components/acerola-shell/acerola-shell`),
    ];

    assert.deepEqual(run('feature-component-in-lib', files), []);
  });

  // feliz
  /* Chamados é uma tela por contexto: o componente que as três usam é compartilhado. */
  it('keeps components shared by the same screen of different contexts', () => {
    const files = [
      file(`${DASHBOARD_LIB}/acerola-ticket-list-view/acerola-ticket-list-view.svelte`),
      ...['infra', 'system', 'maintenance'].map((context) =>
        file(
          `${DASHBOARD_ROUTES}/(app)/${context}/tickets/+page.svelte`,
          `components/acerola-ticket-list-view/acerola-ticket-list-view`,
        ),
      ),
    ];

    assert.deepEqual(run('feature-component-in-lib', files), []);
  });

  // triste
  /* Dentro de um contexto, a feature é a pasta de DENTRO: duas telas de `infra` são duas
     features, e uma só continua sendo uma. */
  it('names the feature by the folder inside the context', () => {
    const files = [
      file(`${DASHBOARD_LIB}/acerola-button/acerola-button.svelte`),
      file(`${DASHBOARD_LIB}/acerola-usage-chart/acerola-usage-chart.svelte`),
      file(
        `${DASHBOARD_ROUTES}/(app)/infra/computers/[id]/+page.svelte`,
        `components/acerola-usage-chart/acerola-usage-chart components/acerola-button/acerola-button`,
      ),
      file(
        `${DASHBOARD_ROUTES}/(app)/infra/parts/+page.svelte`,
        `components/acerola-button/acerola-button`,
      ),
    ];

    assert.deepEqual(run('feature-component-in-lib', files), [
      `${DASHBOARD_LIB}/acerola-usage-chart só usado por routes/infra/computers`,
    ]);
  });

  // triste
  it('follows the import chain in the agent app, without +page', () => {
    const files = [
      file(`${AGENT_LIB}/acerola-metric-tile/acerola-metric-tile.svelte`),
      file(
        `${AGENT_ROUTES}/dashboard/dashboard.svelte`,
        `import M from '$lib/components/acerola-metric-tile/acerola-metric-tile.svelte';`,
      ),
    ];

    assert.deepEqual(run('feature-component-in-lib', files), [
      `${AGENT_LIB}/acerola-metric-tile só usado por routes/dashboard`,
    ]);
  });

  // feliz
  it('never lets a dashboard feature own an agent component with the same name', () => {
    const files = [
      file(`${DASHBOARD_LIB}/acerola-button/acerola-button.svelte`),
      file(`${AGENT_LIB}/acerola-button/acerola-button.svelte`),
      file(
        `${DASHBOARD_ROUTES}/(app)/tickets/+page.svelte`,
        `components/acerola-button/acerola-button`,
      ),
      // O agent nunca importa o próprio botão em nenhuma rota: sem dono, então não é "de feature".
    ];

    assert.deepEqual(run('feature-component-in-lib', files), [
      `${DASHBOARD_LIB}/acerola-button só usado por routes/tickets`,
    ]);
  });

  // feliz
  it('ignores generic-by-design primitives with a single consumer, prefixed or not', () => {
    const files = [
      file(`${DASHBOARD_LIB}/radar-chart/radar-chart.svelte`),
      file(`${DASHBOARD_LIB}/acerola-chart-legend/acerola-chart-legend.svelte`),
      file(`${DASHBOARD_LIB}/acerola-dialog/acerola-dialog.ts`),
      file(
        `${DASHBOARD_ROUTES}/(app)/tickets/+page.svelte`,
        `components/radar-chart/radar-chart components/acerola-chart-legend/acerola-chart-legend components/acerola-dialog/acerola-dialog`,
      ),
      file(`${AGENT_LIB}/acerola-separator/acerola-separator.svelte`),
      file(
        `${AGENT_ROUTES}/dashboard/dashboard.svelte`,
        `components/acerola-separator/acerola-separator`,
      ),
    ];

    assert.deepEqual(run('feature-component-in-lib', files), []);
  });

  // triste
  it('still flags a domain component whose name only resembles a generic one', () => {
    const files = [
      file(`${DASHBOARD_LIB}/acerola-usage-chart/acerola-usage-chart.svelte`),
      file(
        `${DASHBOARD_ROUTES}/(app)/computers/+page.svelte`,
        `components/acerola-usage-chart/acerola-usage-chart`,
      ),
    ];

    assert.deepEqual(run('feature-component-in-lib', files), [
      `${DASHBOARD_LIB}/acerola-usage-chart só usado por routes/computers`,
    ]);
  });
});

describe('hook-location', () => {
  // feliz
  it('accepts use-* folders and the CLI folder', () => {
    const files = [
      file(`${DASHBOARD_HOOKS}/use-task-list/use-task-list.svelte.ts`),
      file(`${DASHBOARD_HOOKS}/ui/is-mobile.svelte.ts`),
    ];

    assert.deepEqual(run('hook-location', files), []);
  });

  // triste
  it('flags loose files and folders without use-', () => {
    const files = [
      file(`${DASHBOARD_HOOKS}/use-mobile.svelte.ts`),
      file(`${DASHBOARD_HOOKS}/mirror-store/mirror-store.svelte.ts`),
    ];

    assert.equal(run('hook-location', files).length, 2);
  });

  // feliz
  it('has nothing to flag in the agent app, which has no lib/hooks', () => {
    const files = [file(`${AGENT_LIB}/acerola-button/acerola-button.svelte`)];

    assert.deepEqual(run('hook-location', files), []);
  });
});

describe('lib-folder', () => {
  // feliz
  it('accepts the mapped folders in both apps', () => {
    const files = [
      file(`${DASHBOARD_LIB.replace('/components', '')}/components/x.svelte`),
      file('acerola/agent/svelte/src/lib/components/x.svelte'),
      file('acerola/agent/svelte/src/lib/utils/format.ts'),
    ];

    assert.deepEqual(run('lib-folder', files), []);
  });

  // triste
  it('flags the agent debt: metrics and reporting are not in the map', () => {
    const files = [
      file('acerola/agent/svelte/src/lib/metrics/store.svelte.ts'),
      file('acerola/agent/svelte/src/lib/reporting/client.ts'),
    ];

    assert.deepEqual(run('lib-folder', files).sort(), [
      'acerola/agent/svelte/src/lib/metrics pasta fora do mapa',
      'acerola/agent/svelte/src/lib/reporting pasta fora do mapa',
    ]);
  });
});

describe('class rules', () => {
  const component = (content, lib = DASHBOARD_LIB) =>
    file(`${lib}/acerola-card/acerola-card.svelte`, `<div class="${content}"></div>`);

  // feliz
  it('accepts role radius, tokens and the shadow scale', () => {
    const files = [
      component('rounded-surface border border-border bg-card text-ink-700 shadow-xs text-xs'),
    ];

    for (const rule of ['radius-by-role', 'raw-palette', 'arbitrary-font-size', 'shadow-scale']) {
      assert.deepEqual(run(rule, files), [], rule);
    }
  });

  // triste
  it('flags size radius, raw palette, pixel fonts and off-scale shadows', () => {
    const files = [component('rounded-lg text-neutral-400 text-[11px] shadow-md')];

    assert.equal(run('radius-by-role', files).length, 1);
    assert.equal(run('raw-palette', files).length, 1);
    assert.equal(run('arbitrary-font-size', files).length, 1);
    assert.equal(run('shadow-scale', files).length, 1);
  });

  // feliz
  it('lets the mobile bottom drawer keep its shadow-2xl', () => {
    const files = [
      file(
        `${DASHBOARD_LIB}/acerola-responsive-dialog-content/acerola-responsive-dialog-content.svelte`,
        `<div class="rounded-t-3xl shadow-2xl"></div>`,
      ),
    ];

    assert.deepEqual(run('shadow-scale', files), []);
  });

  // triste
  it('flags shadow-2xl anywhere else', () => {
    assert.equal(run('shadow-scale', [component('shadow-2xl')]).length, 1);
  });

  // triste
  it('flags the same violations in the agent app', () => {
    const files = [component('rounded-2xl text-neutral-400', AGENT_LIB)];

    assert.equal(run('radius-by-role', files).length, 1);
    assert.equal(run('raw-palette', files).length, 1);
  });

  // feliz
  it('ignores the shadcn CLI folder, in either app', () => {
    const files = [
      file(`${DASHBOARD_LIB}/ui/card/card.svelte`, '<div class="rounded-2xl text-neutral-400"></div>'),
      file(`${AGENT_LIB}/ui/card/card.svelte`, '<div class="rounded-2xl text-neutral-400"></div>'),
    ];

    assert.deepEqual(run('radius-by-role', files), []);
    assert.deepEqual(run('raw-palette', files), []);
  });
});

describe('route rules', () => {
  // triste
  it('flags raw interactive markup and control height in a dashboard route', () => {
    const files = [
      file(`${DASHBOARD_ROUTES}/(app)/tasks/+page.svelte`, '<button class="h-8">x</button>'),
    ];

    assert.equal(run('route-markup', files).length, 1);
    assert.equal(run('route-height', files).length, 1);
  });

  // triste
  it('flags the same in an agent route, which has no +page', () => {
    const files = [file(`${AGENT_ROUTES}/dashboard/dashboard.svelte`, '<input class="h-9" />')];

    assert.equal(run('route-markup', files).length, 1);
    assert.equal(run('route-height', files).length, 1);
  });

  // feliz
  it('leaves a component file alone, even inside routes/', () => {
    const files = [
      file(
        `${DASHBOARD_ROUTES}/(app)/tasks/components/acerola-x/acerola-x.svelte`,
        '<button class="h-8">x</button>',
      ),
    ];

    assert.deepEqual(run('route-markup', files), []);
  });

  // triste
  it('flags a feature importing another feature component', () => {
    const files = [
      file(
        `${DASHBOARD_ROUTES}/(app)/tasks/+page.svelte`,
        `import X from '../tickets/components/acerola-x/acerola-x.svelte';`,
      ),
    ];

    assert.equal(run('cross-feature-import', files).length, 1);
  });
});

describe('storage-folder-language', () => {
  // triste
  it('flags pt-BR bucket folders', () => {
    const files = [
      file(
        'acerola/dashboard/server/src/modules/tickets/service/x.service.ts',
        "const FOLDER = 'chamados-anexos';",
      ),
    ];

    assert.equal(run('storage-folder-language', files).length, 1);
  });

  // feliz
  it('accepts English folders', () => {
    const files = [
      file(
        'acerola/dashboard/server/src/modules/tickets/service/x.service.ts',
        "const FOLDER = 'ticket-attachments';",
      ),
    ];

    assert.deepEqual(run('storage-folder-language', files), []);
  });
});

describe('doc-file-name', () => {
  // triste
  it('flags a doc file name outside kebab-case, anywhere under acerola/', () => {
    const files = [file('acerola/agent/docs/ARQUITETURA.md')];

    assert.equal(run('doc-file-name', files).length, 1);
  });

  // feliz
  it('accepts a kebab-case doc file name', () => {
    const files = [file('acerola/agent/docs/architecture.md')];

    assert.deepEqual(run('doc-file-name', files), []);
  });
});

describe('baseline', () => {
  const violation = { rule: 'raw-palette', file: 'a.svelte', detail: 'text-neutral-400' };

  // feliz
  it('passes when nothing exceeds the baseline', () => {
    const result = compareWithBaseline([violation], countByKey([violation]));

    assert.deepEqual(result, { added: [], fixed: [] });
  });

  // triste
  it('fails on a new occurrence even of a known key', () => {
    const result = compareWithBaseline([violation, violation], countByKey([violation]));

    assert.equal(result.added.length, 1);
  });

  // feliz
  it('reports debt that was paid', () => {
    const result = compareWithBaseline([], countByKey([violation]));

    assert.deepEqual(result.fixed, ['raw-palette|a.svelte|text-neutral-400']);
  });
});

describe('violationsTouching', () => {
  const inFolder = { rule: 'component-prefix', file: `${DASHBOARD_LIB}/text-field`, detail: 'x' };
  const elsewhere = { rule: 'raw-palette', file: `${DASHBOARD_LIB}/acerola-card/acerola-card.svelte`, detail: 'x' };

  // feliz
  it('matches the violation file itself', () => {
    assert.deepEqual(
      violationsTouching([elsewhere], `${DASHBOARD_LIB}/acerola-card/acerola-card.svelte`),
      [elsewhere],
    );
  });

  // feliz
  it('matches a file inside the violation folder (component-prefix is keyed on the folder)', () => {
    assert.deepEqual(
      violationsTouching([inFolder], `${DASHBOARD_LIB}/text-field/text-field.svelte`),
      [inFolder],
    );
  });

  // triste
  it('ignores violations from unrelated files', () => {
    assert.deepEqual(violationsTouching([elsewhere], `${DASHBOARD_LIB}/other/other.svelte`), []);
  });
});
