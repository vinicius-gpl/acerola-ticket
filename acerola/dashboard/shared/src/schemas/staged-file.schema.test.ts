import { describe, expect, it } from 'vitest';

import { stagedFileSchema, uploadRequestSchema } from './staged-file.schema';

const KEY = 'tmp/00000000-0000-4000-8000-000000000001.pdf';

describe('stagedFileSchema', () => {
  // feliz
  it('accepts a key of the staging area with the name the person chose', () => {
    expect(stagedFileSchema.parse({ storageKey: KEY, fileName: 'Nota fiscal.pdf' })).toEqual({
      storageKey: KEY,
      fileName: 'Nota fiscal.pdf',
    });
  });

  // triste
  /* Só a área temporária entra pelo corpo: aceitar uma chave definitiva deixaria alguém
     "anexar" o arquivo de outro chamado pelo endereço dele. */
  it('refuses a key outside the staging area', () => {
    const result = stagedFileSchema.safeParse({
      storageKey: 'ticket-attachments/00000000-0000-4000-8000-000000000001.pdf',
      fileName: 'nota.pdf',
    });

    expect(result.success).toBe(false);
  });

  it('refuses a file name that is trying to be a path', () => {
    const result = stagedFileSchema.safeParse({ storageKey: KEY, fileName: '../../etc/senha.pdf' });

    expect(result.success).toBe(false);
  });
});

describe('uploadRequestSchema', () => {
  // feliz
  it('accepts a file with no type, which the catalogue resolves by the extension', () => {
    expect(
      uploadRequestSchema.parse({ fileName: 'planilha.xlsx', contentType: '', sizeBytes: 10 }),
    ).toMatchObject({ contentType: '' });
  });

  // triste
  it('refuses an empty file', () => {
    expect(
      uploadRequestSchema.safeParse({
        fileName: 'a.pdf',
        contentType: 'application/pdf',
        sizeBytes: 0,
      }).success,
    ).toBe(false);
  });
});
