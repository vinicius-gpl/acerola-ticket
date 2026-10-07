import { describe, expect, it } from 'vitest';

import { decodeUploadedFileName } from './uploaded-file-name.util';

/** Como o nome chega do upload: os bytes UTF-8 do navegador lidos como latin1. */
function asReceived(name: string): string {
  return Buffer.from(name, 'utf8').toString('latin1');
}

describe('decodeUploadedFileName', () => {
  // feliz
  it('puts the accents back on a name that arrived scrambled', () => {
    expect(asReceived('Constituição Normal.pdf')).toBe('ConstituiÃ§Ã£o Normal.pdf');

    expect(decodeUploadedFileName(asReceived('Constituição Normal.pdf'))).toBe(
      'Constituição Normal.pdf',
    );
    expect(decodeUploadedFileName(asReceived('Relatório de manutenção (março).xlsx'))).toBe(
      'Relatório de manutenção (março).xlsx',
    );
  });

  it('leaves a name without accents exactly as it came', () => {
    expect(decodeUploadedFileName('termo-de-titularidade.pdf')).toBe('termo-de-titularidade.pdf');
  });

  // triste
  /* Um "ç" que já era um byte só em latin1 não forma UTF-8: reler estragaria o nome. */
  it('does not touch a name that was legitimate latin1', () => {
    expect(decodeUploadedFileName('ação.pdf')).toBe('ação.pdf');
  });

  it('does not touch a name that already has characters beyond latin1', () => {
    expect(decodeUploadedFileName('planilha — versão 2 ✓.xlsx')).toBe('planilha — versão 2 ✓.xlsx');
  });

  it('returns an empty name as it is', () => {
    expect(decodeUploadedFileName('')).toBe('');
  });
});
