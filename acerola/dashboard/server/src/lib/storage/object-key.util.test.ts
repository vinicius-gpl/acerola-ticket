import { STAGING_KEY_PATTERN } from '@template/shared/schemas/staged-file.schema';
import { describe, expect, it } from 'vitest';

import { buildObjectKey, buildStagingKey } from './object-key.util';

describe('buildObjectKey', () => {
  // feliz
  it('puts the file in the folder and keeps the extension', () => {
    const key = buildObjectKey('tickets', 'contrato.pdf');

    expect(key.startsWith('tickets/')).toBe(true);
    expect(key.endsWith('.pdf')).toBe(true);
  });

  /* Dois envios com o MESMO nome não podem se sobrescrever em silêncio. */
  it('never repeats the address for the same file name', () => {
    expect(buildObjectKey('tickets', 'contrato.pdf')).not.toBe(
      buildObjectKey('tickets', 'contrato.pdf'),
    );
  });

  /* O nome original costuma dizer coisas sobre quem enviou; ele não vira endereço. */
  it('does not carry the original name into the address', () => {
    expect(buildObjectKey('tickets', 'orcamento-cliente-fulano.pdf')).not.toContain('fulano');
  });

  // triste
  /* `../` no nome escaparia da pasta e escreveria onde não devia. */
  it('does not let the file name escape the folder (edge case)', () => {
    const key = buildObjectKey('tickets', '../../etc/senha.pdf');

    expect(key.startsWith('tickets/')).toBe(true);
    expect(key).not.toContain('..');
  });

  /* Arquivo que o navegador EXECUTA se for servido de volta perde a extensão. */
  it('strips extensions the browser would execute (edge case)', () => {
    expect(buildObjectKey('tickets', 'ataque.html')).not.toContain('.html');
    expect(buildObjectKey('tickets', 'ataque.svg')).not.toContain('.svg');
  });

  it('falls back to a safe folder when the folder is unusable (edge case)', () => {
    expect(buildObjectKey('../', 'x.pdf').startsWith('files/')).toBe(true);
  });

  it('accepts a file with no extension at all (edge case)', () => {
    const key = buildObjectKey('tickets', 'LEIAME');

    expect(key.startsWith('tickets/')).toBe(true);
    expect(key).not.toContain('.');
  });
});

describe('buildStagingKey', () => {
  // feliz
  it('builds a key the contract recognizes as staging', () => {
    expect(STAGING_KEY_PATTERN.test(buildStagingKey('nota fiscal.PDF'))).toBe(true);
  });

  // triste
  it('a final key never passes for a staging one', () => {
    expect(STAGING_KEY_PATTERN.test(buildObjectKey('ticket-attachments', 'a.pdf'))).toBe(false);
  });
});
