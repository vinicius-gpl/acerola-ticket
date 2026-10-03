import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { type ProjectFile, RULES, compareWithBaseline, countByKey } from './design-rules';

function run(ruleId: string, files: ProjectFile[]): string[] {
  const rule = RULES.find((candidate) => candidate.id === ruleId);
  assert.ok(rule, `unknown rule ${ruleId}`);

  return rule.check(files).map((violation) => `${violation.file} ${violation.detail}`);
}

function file(path: string, content = ''): ProjectFile {
  return { path, content };
}

const LIB = 'client/src/lib/components';
const ROUTES = 'client/src/routes';

describe('component-prefix', () => {
  // feliz
  it('accepts acerola-* folders in lib and in feature routes', () => {
    const files = [
      file(`${LIB}/acerola-button/acerola-button.svelte`),
      file(`${ROUTES}/(app)/tickets/components/acerola-ticket-card/acerola-ticket-card.svelte`),
      file(`${LIB}/ui/button/button.svelte`),
    ];

    assert.deepEqual(run('component-prefix', files), []);
  });

  // triste
  it('flags folders without the prefix', () => {
    const files = [
      file(`${LIB}/text-field/text-field.svelte`),
      file(`${ROUTES}/(app)/dashboard/components/maintenance-log/maintenance-log.svelte`),
    ];

    assert.equal(run('component-prefix', files).length, 2);
  });
});

describe('feature-component-in-lib', () => {
  // triste
  it('follows the import chain to the single feature that owns it', () => {
    const files = [
      file(
        `${LIB}/acerola-dashboard-view/acerola-dashboard-view.svelte`,
        `import X from '$lib/components/acerola-peaking/acerola-peaking.svelte';`,
      ),
      file(`${LIB}/acerola-peaking/acerola-peaking.svelte`),
      file(
        `${ROUTES}/(app)/dashboard/+page.svelte`,
        `import V from '$lib/components/acerola-dashboard-view/acerola-dashboard-view.svelte';`,
      ),
    ];

    assert.deepEqual(run('feature-component-in-lib', files).sort(), [
      `${LIB}/acerola-dashboard-view só usado por routes/dashboard`,
      `${LIB}/acerola-peaking só usado por routes/dashboard`,
    ]);
  });

  // feliz
  it('keeps components used by two features or by the root layout', () => {
    const files = [
      file(`${LIB}/acerola-button/acerola-button.svelte`),
      file(`${LIB}/acerola-shell/acerola-shell.svelte`),
      file(`${ROUTES}/(app)/tickets/+page.svelte`, `components/acerola-button/acerola-button`),
      file(`${ROUTES}/(app)/parts/+page.svelte`, `components/acerola-button/acerola-button`),
      file(`${ROUTES}/+layout.svelte`, `components/acerola-shell/acerola-shell`),
    ];

    assert.deepEqual(run('feature-component-in-lib', files), []);
  });
});

describe('hook-location', () => {
  // feliz
  it('accepts use-* folders and the CLI folder', () => {
    const files = [
      file('client/src/lib/hooks/use-task-list/use-task-list.svelte.ts'),
      file('client/src/lib/hooks/ui/is-mobile.svelte.ts'),
    ];

    assert.deepEqual(run('hook-location', files), []);
  });

  // triste
  it('flags loose files and folders without use-', () => {
    const files = [
      file('client/src/lib/hooks/use-mobile.svelte.ts'),
      file('client/src/lib/hooks/mirror-store/mirror-store.svelte.ts'),
    ];

    assert.equal(run('hook-location', files).length, 2);
  });
});

describe('class rules', () => {
  const component = (content: string) =>
    file(`${LIB}/acerola-card/acerola-card.svelte`, `<div class="${content}"></div>`);

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
  it('ignores the shadcn CLI folder', () => {
    const files = [
      file(`${LIB}/ui/card/card.svelte`, '<div class="rounded-2xl text-neutral-400"></div>'),
    ];

    assert.deepEqual(run('radius-by-role', files), []);
    assert.deepEqual(run('raw-palette', files), []);
  });
});

describe('route rules', () => {
  // triste
  it('flags raw interactive markup and control height in a route', () => {
    const files = [file(`${ROUTES}/(app)/tasks/+page.svelte`, '<button class="h-8">x</button>')];

    assert.equal(run('route-markup', files).length, 1);
    assert.equal(run('route-height', files).length, 1);
  });

  // triste
  it('flags a feature importing another feature component', () => {
    const files = [
      file(
        `${ROUTES}/(app)/tasks/+page.svelte`,
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
      file('server/src/modules/tickets/service/x.service.ts', "const FOLDER = 'chamados-anexos';"),
    ];

    assert.equal(run('storage-folder-language', files).length, 1);
  });

  // feliz
  it('accepts English folders', () => {
    const files = [
      file(
        'server/src/modules/tickets/service/x.service.ts',
        "const FOLDER = 'ticket-attachments';",
      ),
    ];

    assert.deepEqual(run('storage-folder-language', files), []);
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
