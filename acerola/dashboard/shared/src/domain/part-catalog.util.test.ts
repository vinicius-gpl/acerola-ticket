import { describe, expect, it } from 'vitest';

import {
  balanceAfter,
  fitsInStock,
  movementTypeLabel,
  partCategoryLabel,
  partConditionLabel,
} from './part-catalog.util';

describe('partCategoryLabel', () => {
  // feliz
  it('reads the category in the words the shelf uses', () => {
    expect(partCategoryLabel('adapter_dp_vga')).toBe('Adaptador DisplayPort → VGA');
    expect(partCategoryLabel('desktop')).toBe('Máquina (CPU)');
  });
});

describe('partConditionLabel', () => {
  // feliz
  it('tells a new part from a used one', () => {
    expect(partConditionLabel('new')).toBe('Nova');
    expect(partConditionLabel('used')).toBe('Usada');
  });
});

describe('movementTypeLabel', () => {
  // feliz
  it('reads the movement as the person wrote it down', () => {
    expect(movementTypeLabel('in')).toBe('Entrada');
    expect(movementTypeLabel('out')).toBe('Saída');
  });
});

describe('balanceAfter', () => {
  // feliz
  it('adds what came in and subtracts what went out', () => {
    expect(balanceAfter(4, 'in', 2)).toBe(6);
    expect(balanceAfter(4, 'out', 3)).toBe(1);
  });

  it('empties the shelf when the last one leaves', () => {
    expect(balanceAfter(2, 'out', 2)).toBe(0);
  });

  // triste
  /* A conta é só a conta: quem decide se a saída PODE acontecer é `fitsInStock`. Prender o
     resultado em zero aqui esconderia a diferença de quem for conferir a prateleira. */
  it('does not hide a shortfall by clamping at zero', () => {
    expect(balanceAfter(2, 'out', 5)).toBe(-3);
  });
});

describe('fitsInStock', () => {
  // feliz
  it('lets a part out while there is stock for it', () => {
    expect(fitsInStock(4, 'out', 4)).toBe(true);
    expect(fitsInStock(4, 'out', 1)).toBe(true);
  });

  it('never blocks something coming in', () => {
    expect(fitsInStock(0, 'in', 10)).toBe(true);
  });

  // triste
  /* Tirar 5 de um estoque de 2 fazia o saldo mentir no sistema antigo, e a diferença só
     aparecia quando alguém ia buscar a peça e não achava. */
  it('refuses to take out more than what is on the shelf', () => {
    expect(fitsInStock(2, 'out', 5)).toBe(false);
    expect(fitsInStock(0, 'out', 1)).toBe(false);
  });
});
