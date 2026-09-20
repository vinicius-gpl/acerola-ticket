import { describe, expect, it } from 'vitest';

import { colorOfSlice, countBy, FALLBACK_COLORS } from './chart-slice.util';

describe('colorOfSlice', () => {
  // feliz
  it('uses the fixed color of a known category', () => {
    expect(colorOfSlice('Concluída', 5)).toBe('#10b981');
  });

  it('walks the fallback list in order for unknown categories', () => {
    expect(colorOfSlice('Qualquer', 0)).toBe(FALLBACK_COLORS[0]);
    expect(colorOfSlice('Outra', 1)).toBe(FALLBACK_COLORS[1]);
  });

  // triste
  it('wraps around instead of running out of colors', () => {
    expect(colorOfSlice('Nona', FALLBACK_COLORS.length)).toBe(FALLBACK_COLORS[0]);
  });
});

describe('countBy', () => {
  // feliz
  it('counts by key, biggest first', () => {
    const rows = [{ city: 'Goiânia' }, { city: 'Anápolis' }, { city: 'Goiânia' }];

    expect(countBy(rows, (row) => row.city)).toEqual([
      { label: 'Goiânia', value: 2 },
      { label: 'Anápolis', value: 1 },
    ]);
  });

  // triste
  /* Fatia que some esconde que há registro sem o campo preenchido. */
  it('turns a missing value into N/A instead of dropping it', () => {
    expect(countBy([{ city: null }], (row) => row.city)).toEqual([{ label: 'N/A', value: 1 }]);
  });

  it('returns an empty list for no rows', () => {
    expect(countBy([], () => 'x')).toEqual([]);
  });
});
