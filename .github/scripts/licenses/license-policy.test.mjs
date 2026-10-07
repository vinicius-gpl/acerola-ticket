import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  checkPackages,
  declaredLicenseOf,
  detectLicenseFromText,
  forbiddenImportsIn,
  importSpecifiersOf,
  isLicenseAllowed,
  normalizeLicenseId,
} from './license-policy.mjs';

const ALLOW = ['MIT', 'ISC', 'Apache-2.0', 'BSD-3-Clause', 'Zlib'];

describe('normalizeLicenseId', () => {
  // feliz
  it('reads the old spellings as the standard name', () => {
    assert.equal(normalizeLicenseId('MIT/X11'), 'MIT');
    assert.equal(normalizeLicenseId('Apache 2.0'), 'Apache-2.0');
    assert.equal(normalizeLicenseId(' ISC '), 'ISC');
  });

  it('drops the "or later" mark, which does not change who the license is', () => {
    assert.equal(normalizeLicenseId('Apache-2.0+'), 'Apache-2.0');
  });
});

describe('isLicenseAllowed', () => {
  // feliz
  it('accepts a license that is on the list', () => {
    assert.equal(isLicenseAllowed('MIT', ALLOW), true);
    assert.equal(isLicenseAllowed('Apache License 2.0', ALLOW), true);
  });

  /* `OR` é escolha de quem usa: basta uma das duas servir. */
  it('accepts a choice when one side is allowed', () => {
    assert.equal(isLicenseAllowed('(MIT OR GPL-3.0-or-later)', ALLOW), true);
    assert.equal(isLicenseAllowed('GPL-3.0-only OR MIT', ALLOW), true);
  });

  it('accepts a combination when every part is allowed', () => {
    assert.equal(isLicenseAllowed('(MIT AND Zlib)', ALLOW), true);
    assert.equal(isLicenseAllowed('Apache-2.0 AND MIT', ALLOW), true);
  });

  // triste
  it('refuses a copyleft license', () => {
    assert.equal(isLicenseAllowed('AGPL-3.0-only', ALLOW), false);
    assert.equal(isLicenseAllowed('GPL-3.0-or-later', ALLOW), false);
  });

  /* `AND` soma as obrigações: uma parte proibida proíbe o conjunto. */
  it('refuses a combination with one forbidden part', () => {
    assert.equal(isLicenseAllowed('MIT AND AGPL-3.0-only', ALLOW), false);
    assert.equal(isLicenseAllowed('(MIT OR ISC) AND GPL-2.0-only', ALLOW), false);
  });

  it('refuses a choice where no side is allowed', () => {
    assert.equal(isLicenseAllowed('GPL-2.0-only OR AGPL-3.0-only', ALLOW), false);
  });

  /* A exceção de um `WITH` só afrouxa a licença de base — não a torna permitida. */
  it('judges a WITH expression by its base license', () => {
    assert.equal(isLicenseAllowed('GPL-2.0-only WITH Classpath-exception-2.0', ALLOW), false);
    assert.equal(isLicenseAllowed('Apache-2.0 WITH LLVM-exception', ALLOW), true);
  });

  it('refuses what it cannot read, instead of guessing', () => {
    assert.equal(isLicenseAllowed('', ALLOW), false);
    assert.equal(isLicenseAllowed('UNKNOWN', ALLOW), false);
    assert.equal(isLicenseAllowed('(MIT OR', ALLOW), false);
    assert.equal(isLicenseAllowed('MIT )', ALLOW), false);
    assert.equal(isLicenseAllowed(undefined, ALLOW), false);
    assert.equal(isLicenseAllowed("Standard 'no charge' license: https://example.invalid", ALLOW), false);
  });
});

describe('checkPackages', () => {
  const policy = {
    allow: ALLOW,
    exceptions: [
      { ecosystem: 'node', package: 'unused-ui', license: 'AGPL-3.0-only', reason: 'instalado, não importado' },
      { ecosystem: 'go', package: 'example.invalid/other', license: 'UNKNOWN', reason: 'de outro ecossistema' },
    ],
  };

  // feliz
  it('lets through what is allowed and what has an exception for that exact license', () => {
    const result = checkPackages(
      [
        { name: 'left-pad', version: '1.0.0', license: 'MIT' },
        { name: 'unused-ui', version: '2.0.0', license: 'AGPL-3.0-only' },
      ],
      policy,
      'node',
    );

    assert.deepEqual(result.refused, []);
    assert.deepEqual(result.unused, []);
  });

  // triste
  it('refuses a forbidden license that nobody reviewed', () => {
    const viral = { name: 'viral', version: '1.0.0', license: 'GPL-3.0-only' };
    const result = checkPackages([viral], { allow: ALLOW, exceptions: [] }, 'node');

    assert.deepEqual(result.refused, [viral]);
  });

  /* A exceção vale para a licença que foi avaliada. Mudou a licença, alguém olha de novo. */
  it('does not stretch an exception to a license it was not written for', () => {
    const changed = { name: 'unused-ui', version: '3.0.0', license: 'SSPL-1.0' };
    const result = checkPackages([changed], policy, 'node');

    assert.deepEqual(result.refused, [changed]);
    assert.equal(result.unused.length, 1);
  });

  /* Exceção sem uso é porta aberta para um pacote que já saiu. */
  it('reports an exception that no installed package needed', () => {
    const result = checkPackages([{ name: 'left-pad', version: '1.0.0', license: 'MIT' }], policy, 'node');

    assert.deepEqual(result.unused.map((item) => item.package), ['unused-ui']);
  });

  it('keeps the exceptions of one ecosystem out of the other', () => {
    const result = checkPackages([{ name: 'example.invalid/other', version: '1', license: 'UNKNOWN' }], policy, 'node');

    assert.equal(result.refused.length, 1);
  });
});

describe('importSpecifiersOf', () => {
  // feliz
  it('finds static, dynamic and required imports', () => {
    const source = `
      import a from 'pkg-a';
      import { b } from "pkg-b/sub";
      const c = await import('pkg-c');
      const d = require('pkg-d');
      export { e } from 'pkg-e';
    `;

    assert.deepEqual(importSpecifiersOf(source), ['pkg-a', 'pkg-b/sub', 'pkg-c', 'pkg-d', 'pkg-e']);
  });

  // triste
  it('finds nothing in a file that imports nothing', () => {
    assert.deepEqual(importSpecifiersOf('const from = "not an import";'), []);
  });
});

describe('forbiddenImportsIn', () => {
  const forbidden = [{ pattern: '@scope/kit/react', reason: 'puxa código AGPL' }];

  // feliz
  it('lets the allowed entry of the same package through', () => {
    assert.deepEqual(forbiddenImportsIn("import { x } from '@scope/kit/auth';", forbidden), []);
  });

  // triste
  it('catches the forbidden entry and anything under it', () => {
    assert.equal(forbiddenImportsIn("import { x } from '@scope/kit/react';", forbidden).length, 1);
    assert.equal(forbiddenImportsIn("import { x } from '@scope/kit/react/ui';", forbidden).length, 1);
  });

  /* `@scope/kit/reactive` não é `@scope/kit/react`: o prefixo casa por pedaço de caminho. */
  it('does not confuse a longer name with the forbidden one', () => {
    assert.deepEqual(forbiddenImportsIn("import { x } from '@scope/kit/reactive';", forbidden), []);
  });
});

describe('detectLicenseFromText', () => {
  // feliz
  it('recognizes the texts that cannot be mistaken', () => {
    assert.equal(detectLicenseFromText('MIT License\n\nCopyright (c) 2017 Alguém'), 'MIT');
    assert.equal(detectLicenseFromText('free software released under the MIT/X11 license:'), 'MIT');
    assert.equal(detectLicenseFromText('                Apache License\n          Version 2.0, January 2004'), 'Apache-2.0');
    assert.equal(detectLicenseFromText('ISC License\n\nCopyright (c) Alguém'), 'ISC');
  });

  // triste
  it('calls unknown what it does not recognize, instead of guessing', () => {
    assert.equal(detectLicenseFromText('Todos os direitos reservados.'), 'UNKNOWN');
    assert.equal(detectLicenseFromText(''), 'UNKNOWN');
  });
});

describe('declaredLicenseOf', () => {
  // feliz
  it('reads the license in every shape a manifest has used', () => {
    assert.equal(declaredLicenseOf({ license: 'MIT' }), 'MIT');
    assert.equal(declaredLicenseOf({ license: { type: 'ISC' } }), 'ISC');
    assert.equal(declaredLicenseOf({ licenses: [{ type: 'MIT' }, { type: 'Apache-2.0' }] }), 'MIT OR Apache-2.0');
  });

  // triste
  it('gives nothing when the manifest declares no license', () => {
    assert.equal(declaredLicenseOf({}), null);
    assert.equal(declaredLicenseOf({ license: '  ' }), null);
    assert.equal(declaredLicenseOf({ licenses: [] }), null);
  });
});
