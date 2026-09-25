import { describe, expect, it } from 'vitest';

import {
  BUDGET_NEEDS,
  BUDGET_NEED_CATEGORY,
  budgetNeedHint,
  budgetNeedLabel,
  needsPurchase,
  toBuyOf,
} from './budget-need.util';

describe('toBuyOf', () => {
  // feliz
  it('discounts what the storeroom already has', () => {
    expect(toBuyOf(12, 4)).toBe(8);
  });

  // triste
  /* Sobra de depósito não vira crédito, e nenhuma lista de compras mostra "-6". */
  it('never asks for a negative amount', () => {
    expect(toBuyOf(2, 9)).toBe(0);
  });

  it('asks for nothing when nobody needs it', () => {
    expect(toBuyOf(0, 0)).toBe(0);
  });
});

describe('needsPurchase', () => {
  // feliz
  it('says there is something to buy when the shelf falls short', () => {
    expect(needsPurchase(5, 2)).toBe(true);
  });

  // triste
  /* Necessidade coberta continua na tela, zerada: é a boa notícia da lista. */
  it('says there is nothing to buy when the shelf covers it', () => {
    expect(needsPurchase(3, 3)).toBe(false);
  });
});

describe('BUDGET_NEED_CATEGORY', () => {
  // feliz
  /* Necessidade sem prateleira é necessidade sem desconto: a tela mandaria comprar o que já
     está guardado. */
  it('points every need at a shelf, a label and a rule', () => {
    for (const key of BUDGET_NEEDS) {
      expect(BUDGET_NEED_CATEGORY[key]).toBeTruthy();
      expect(budgetNeedLabel(key)).toBeTruthy();
      expect(budgetNeedHint(key)).toBeTruthy();
    }
  });
});
