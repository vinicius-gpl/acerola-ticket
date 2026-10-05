import { describe, expect, it } from 'vitest';

import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
  inventoryCategoryLabel,
  inventoryCategoryOptions,
  inventoryUnitLabel,
  inventoryUnitOptions,
  inventoryUnitShortLabel,
  isInventoryCategory,
  isInventoryUnit,
} from './inventory-catalog.util';

describe('inventory categories', () => {
  // feliz
  it('reads every category in Portuguese', () => {
    for (const category of INVENTORY_CATEGORIES) {
      expect(inventoryCategoryLabel(category)).toBeTruthy();
    }
  });

  it('offers one option per category, in the order of the list', () => {
    expect(inventoryCategoryOptions().map((option) => option.value)).toEqual([
      ...INVENTORY_CATEGORIES,
    ]);
  });

  // triste
  /* O que vem do banco ou da URL é texto solto: a lista é a única régua. */
  it('refuses a category that is not in the list', () => {
    expect(isInventoryCategory('cadeira')).toBe(false);
    expect(isInventoryCategory(null)).toBe(false);
    expect(isInventoryCategory(7)).toBe(false);
  });

  it('accepts a category of the list', () => {
    expect(isInventoryCategory('pantry')).toBe(true);
  });
});

describe('inventory units', () => {
  // feliz
  it('reads every unit in Portuguese, long and short', () => {
    for (const unit of INVENTORY_UNITS) {
      expect(inventoryUnitLabel(unit)).toBeTruthy();
      expect(inventoryUnitShortLabel(unit)).toBeTruthy();
    }
  });

  /* A abreviação fica colada no número do estoque: mais longa que isso quebra o cartão. */
  it('keeps the short label short enough to sit next to a number', () => {
    for (const unit of INVENTORY_UNITS) {
      expect(inventoryUnitShortLabel(unit).length).toBeLessThanOrEqual(3);
    }
  });

  it('offers one option per unit', () => {
    expect(inventoryUnitOptions()).toHaveLength(INVENTORY_UNITS.length);
  });

  // triste
  it('refuses a unit that is not in the list', () => {
    expect(isInventoryUnit('dúzia')).toBe(false);
    expect(isInventoryUnit(undefined)).toBe(false);
  });
});
