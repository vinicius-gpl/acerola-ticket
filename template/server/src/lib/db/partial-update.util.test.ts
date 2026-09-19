import { describe, expect, it } from 'vitest';

import { mapDefined, setIfDefined } from './partial-update.util';

describe('setIfDefined', () => {
  // feliz
  it('writes the column when the field came', () => {
    const update: { title?: string | null } = {};
    setIfDefined(update, 'title', 'Revisar contrato');

    expect(update).toEqual({ title: 'Revisar contrato' });
  });

  /* "Limpe este campo" precisa chegar ao banco. Tratar nulo como ausente tornaria impossível
     apagar uma descrição digitada errado. */
  it('writes null when the field came as null — null means "clear this"', () => {
    const update: { title?: string | null } = {};
    setIfDefined(update, 'title', null);

    expect(update).toEqual({ title: null });
    expect('title' in update).toBe(true);
  });

  // triste
  it('does not create the key when the field did not come', () => {
    const update: { title?: string | null } = {};
    setIfDefined(update, 'title', undefined);

    expect(update).toEqual({});
    expect('title' in update).toBe(false);
  });

  it('writes empty string, false and zero, which are legitimate values', () => {
    const update: { text?: string; flag?: boolean; count?: number } = {};
    setIfDefined(update, 'text', '');
    setIfDefined(update, 'flag', false);
    setIfDefined(update, 'count', 0);

    expect(update).toEqual({ text: '', flag: false, count: 0 });
  });

  it('does not erase a value already set when called with absent afterwards', () => {
    const update: { title?: string | null } = { title: 'A' };
    setIfDefined(update, 'title', undefined);

    expect(update.title).toBe('A');
  });
});

describe('mapDefined', () => {
  const digits = (value: string) => value.replace(/\D/g, '');

  // feliz
  it('normalizes when the field came', () => {
    expect(mapDefined('12.345.678/0001-95', digits)).toBe('12345678000195');
  });

  it('keeps absent as absent', () => {
    expect(mapDefined(undefined, digits)).toBeUndefined();
  });

  // triste
  /* Normalizar antes de checar transformaria `undefined` em `null`, e toda edição parcial
     apagaria os campos que ela nem mencionou. */
  it('keeps null as null, without calling the normalization', () => {
    let called = false;
    const spy = (value: string) => {
      called = true;

      return value;
    };

    expect(mapDefined(null, spy)).toBeNull();
    expect(called).toBe(false);
  });

  it('normalizes an empty string instead of treating it as absent', () => {
    expect(mapDefined('', digits)).toBe('');
  });
});
