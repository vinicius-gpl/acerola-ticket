/**
 * O CATÁLOGO DO INVENTÁRIO DA MANUTENÇÃO: o que ela guarda e em que medida.
 *
 * É outro cadastro, e não o Depósito da TI (`part-catalog.util`): ali são peças de
 * computador, aqui são as coisas do prédio e do dia a dia do escritório — cadeira, mesa,
 * café do mercadinho, material de limpeza. Duas listas separadas de propósito: juntar
 * "SSD" e "cadeira" na mesma gaveta faria as duas equipes tropeçarem na lista da outra.
 *
 * A chave é inglês (o usuário não vê) e o rótulo é português (vê) — CONTRIBUTING §1.
 */

export const INVENTORY_CATEGORIES = [
  'furniture',
  'pantry',
  'cleaning',
  'utility',
  'appliance',
  'other',
] as const;

export type InventoryCategory = (typeof INVENTORY_CATEGORIES)[number];

export const INVENTORY_CATEGORY_LABELS: Record<InventoryCategory, string> = {
  furniture: 'Mobiliário',
  pantry: 'Mercadinho',
  cleaning: 'Limpeza',
  utility: 'Elétrica e hidráulica',
  appliance: 'Eletrodoméstico',
  other: 'Outro',
};

export function inventoryCategoryLabel(category: InventoryCategory): string {
  return INVENTORY_CATEGORY_LABELS[category];
}

export function isInventoryCategory(value: unknown): value is InventoryCategory {
  return (
    typeof value === 'string' && (INVENTORY_CATEGORIES as readonly string[]).includes(value)
  );
}

export function inventoryCategoryOptions(): { value: InventoryCategory; label: string }[] {
  return INVENTORY_CATEGORIES.map((value) => ({
    value,
    label: INVENTORY_CATEGORY_LABELS[value],
  }));
}

/**
 * A MEDIDA do produto — é o que dá sentido ao número do estoque: "3" de café é 3 pacotes,
 * "3" de cadeira são 3 cadeiras, e "3" de desinfetante são 3 litros.
 */
export const INVENTORY_UNITS = ['unit', 'box', 'package', 'liter', 'kilogram'] as const;

export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

export const INVENTORY_UNIT_LABELS: Record<InventoryUnit, string> = {
  unit: 'Unidade',
  box: 'Caixa',
  package: 'Pacote',
  liter: 'Litro',
  kilogram: 'Quilo',
};

/** A abreviação que cabe ao lado do número, num cartão estreito. */
export const INVENTORY_UNIT_SHORT_LABELS: Record<InventoryUnit, string> = {
  unit: 'un',
  box: 'cx',
  package: 'pct',
  liter: 'L',
  kilogram: 'kg',
};

export function inventoryUnitLabel(unit: InventoryUnit): string {
  return INVENTORY_UNIT_LABELS[unit];
}

export function inventoryUnitShortLabel(unit: InventoryUnit): string {
  return INVENTORY_UNIT_SHORT_LABELS[unit];
}

export function isInventoryUnit(value: unknown): value is InventoryUnit {
  return typeof value === 'string' && (INVENTORY_UNITS as readonly string[]).includes(value);
}

export function inventoryUnitOptions(): { value: InventoryUnit; label: string }[] {
  return INVENTORY_UNITS.map((value) => ({ value, label: INVENTORY_UNIT_LABELS[value] }));
}
