import { describe, expect, it } from 'vitest';

import {
  INVENTORY_NAME_MAX_LENGTH,
  createInventoryItemSchema,
  inventoryItemFormSchema,
  inventoryItemListQuerySchema,
  updateInventoryItemSchema,
} from './inventory-item.schema';

function validItem() {
  return { name: 'Cadeira de escritório', category: 'furniture', unit: 'unit' } as const;
}

describe('createInventoryItemSchema', () => {
  // feliz
  it('accepts a product with the fields that matter', () => {
    const parsed = createInventoryItemSchema.parse({
      ...validItem(),
      location: 'Sala da contabilidade',
      code: 'PAT-0042',
      note: 'Encosto quebrado, trocar o pistão',
    });

    expect(parsed.name).toBe('Cadeira de escritório');
    expect(parsed.location).toBe('Sala da contabilidade');
  });

  /* Quem digita um espaço antes do nome não está dando outro nome ao produto. */
  it('trims the name', () => {
    expect(createInventoryItemSchema.parse({ ...validItem(), name: '  Café  ' }).name).toBe(
      'Café',
    );
  });

  /* Campo em branco vira NULO: `''` no banco fingiria que a pessoa escreveu alguma coisa. */
  it('turns the optional fields left blank into nothing', () => {
    const parsed = createInventoryItemSchema.parse({ ...validItem(), location: '', note: '' });

    expect(parsed.location).toBeNull();
    expect(parsed.note).toBeNull();
  });

  // triste
  it('refuses a product without a name, saying what to do', () => {
    const result = createInventoryItemSchema.safeParse({ ...validItem(), name: '   ' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Informe o nome do produto');
  });

  it('refuses a name longer than the limit', () => {
    const result = createInventoryItemSchema.safeParse({
      ...validItem(),
      name: 'a'.repeat(INVENTORY_NAME_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });

  it('refuses a category that is not in the list', () => {
    const result = createInventoryItemSchema.safeParse({ ...validItem(), category: 'cadeira' });

    expect(result.error?.issues[0]?.message).toBe('Escolha uma categoria da lista');
  });

  it('refuses a unit that is not in the list', () => {
    const result = createInventoryItemSchema.safeParse({ ...validItem(), unit: 'dúzia' });

    expect(result.error?.issues[0]?.message).toBe('Escolha como este produto é contado');
  });
});

describe('updateInventoryItemSchema', () => {
  // feliz
  /* A tela manda só o que mudou: o resto fica como está. */
  it('accepts a change of a single field', () => {
    expect(updateInventoryItemSchema.parse({ location: 'Depósito' }).location).toBe('Depósito');
  });

  it('accepts the order to remove the photo', () => {
    expect(updateInventoryItemSchema.parse({ removePhoto: 'true' }).removePhoto).toBe(true);
  });

  // triste
  it('refuses an empty name on an update too', () => {
    expect(updateInventoryItemSchema.safeParse({ name: '  ' }).success).toBe(false);
  });
});

describe('inventoryItemFormSchema', () => {
  // feliz
  /* No formulário, campo vazio é `''` — é o que um `input` devolve. */
  it('accepts the optional fields as empty text', () => {
    const result = inventoryItemFormSchema.safeParse({
      name: 'Café em pó',
      category: 'pantry',
      unit: 'package',
      location: '',
      code: '',
      note: '',
    });

    expect(result.success).toBe(true);
  });

  // triste
  it('refuses the form without a name', () => {
    const result = inventoryItemFormSchema.safeParse({
      name: '',
      category: 'pantry',
      unit: 'package',
      location: '',
      code: '',
      note: '',
    });

    expect(result.success).toBe(false);
  });
});

describe('inventoryItemListQuerySchema', () => {
  // feliz
  it('reads the page and the filters from the query string', () => {
    const parsed = inventoryItemListQuerySchema.parse({
      page: '2',
      pageSize: '15',
      search: ' café ',
      category: 'pantry',
    });

    expect(parsed.page).toBe(2);
    expect(parsed.search).toBe('café');
  });

  // triste
  it('refuses a category that is not in the list', () => {
    expect(inventoryItemListQuerySchema.safeParse({ category: 'bebida' }).success).toBe(false);
  });
});
