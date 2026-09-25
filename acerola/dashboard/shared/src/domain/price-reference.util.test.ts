import { describe, expect, it } from 'vitest';

import { PRICE_REFERENCES, estimateFor, referencesFor } from './price-reference.util';

describe('referencesFor', () => {
  // feliz
  it('brings what to buy for a need', () => {
    const memory = referencesFor('memory');

    expect(memory.length).toBeGreaterThan(0);
    expect(memory.every((reference) => reference.key === 'memory')).toBe(true);
  });

  // triste
  it('brings nothing for a need with no reference', () => {
    expect(referencesFor('teleport')).toEqual([]);
  });
});

describe('estimateFor', () => {
  // feliz
  it('multiplies the range by the quantity', () => {
    const one = estimateFor('memory', 1);
    const three = estimateFor('memory', 3);

    expect(three?.min).toBe((one?.min ?? 0) * 3);
    expect(three?.max).toBe((one?.max ?? 0) * 3);
  });

  /* Mínimo e máximo, nunca um número só: uma faixa se apresenta como estimativa, e um número
     redondo viraria cotação na primeira reunião de orçamento. */
  it('keeps the floor below the ceiling', () => {
    const estimate = estimateFor('disk', 2);

    expect(estimate?.min).toBeLessThan(estimate?.max ?? 0);
  });

  // triste
  it('estimates nothing when there is nothing to buy', () => {
    expect(estimateFor('memory', 0)).toBeNull();
  });

  it('estimates nothing for a need with no reference', () => {
    expect(estimateFor('teleport', 5)).toBeNull();
  });
});

describe('PRICE_REFERENCES', () => {
  // feliz
  /* Referência sem link é referência pela metade: a lista existe para ninguém começar a
     pesquisa do zero. */
  it('gives every item a range and somewhere to look', () => {
    for (const reference of PRICE_REFERENCES) {
      expect(reference.minPrice).toBeGreaterThan(0);
      expect(reference.maxPrice).toBeGreaterThanOrEqual(reference.minPrice);
      expect(reference.links.length).toBeGreaterThan(0);
      expect(reference.links.every((link) => link.url.startsWith('https://'))).toBe(true);
    }
  });
});
