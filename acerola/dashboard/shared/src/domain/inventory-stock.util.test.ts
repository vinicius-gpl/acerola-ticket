import { describe, expect, it } from 'vitest';

import {
  DISPOSAL_REASONS,
  STOCK_MOVEMENT_TYPES,
  disposalReasonLabel,
  disposalReasonOptions,
  fitsInInventoryStock,
  isStockMovementType,
  stockAfter,
  stockMovementTypeLabel,
} from './inventory-stock.util';

describe('stockAfter', () => {
  // feliz
  it('adds what comes in', () => {
    expect(stockAfter(3, 'in', 2)).toBe(5);
  });

  it('takes away what goes out and what is discarded', () => {
    expect(stockAfter(5, 'out', 2)).toBe(3);
    expect(stockAfter(5, 'disposal', 5)).toBe(0);
  });
});

describe('fitsInInventoryStock', () => {
  // feliz
  it('always accepts an entry', () => {
    expect(fitsInInventoryStock(0, 'in', 10)).toBe(true);
  });

  it('accepts taking out exactly what exists', () => {
    expect(fitsInInventoryStock(4, 'out', 4)).toBe(true);
  });

  // triste
  /* Saldo negativo é sinal de entrada esquecida: aceitar calado faria o número mentir. */
  it('refuses taking out or discarding more than exists', () => {
    expect(fitsInInventoryStock(2, 'out', 5)).toBe(false);
    expect(fitsInInventoryStock(0, 'disposal', 1)).toBe(false);
  });
});

describe('labels', () => {
  // feliz
  it('has a label in Portuguese for every movement and every reason', () => {
    for (const type of STOCK_MOVEMENT_TYPES) expect(stockMovementTypeLabel(type)).toBeTruthy();
    for (const reason of DISPOSAL_REASONS) expect(disposalReasonLabel(reason)).toBeTruthy();
    expect(disposalReasonOptions()).toHaveLength(DISPOSAL_REASONS.length);
  });

  // triste
  it('does not take an unknown word for a movement', () => {
    expect(isStockMovementType('disposal')).toBe(true);
    expect(isStockMovementType('emprestimo')).toBe(false);
    expect(isStockMovementType(null)).toBe(false);
  });
});
