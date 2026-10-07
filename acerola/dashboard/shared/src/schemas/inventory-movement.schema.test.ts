import { describe, expect, it } from 'vitest';

import {
  INVENTORY_MOVEMENT_NOTE_MAX_LENGTH,
  createInventoryMovementSchema,
  inventoryMovementFormSchema,
  inventoryMovementListQuerySchema,
} from './inventory-movement.schema';

describe('createInventoryMovementSchema', () => {
  // feliz
  it('accepts an entry with the quantity that came as text', () => {
    const parsed = createInventoryMovementSchema.parse({ type: 'in', quantity: '12' });

    expect(parsed.quantity).toBe(12);
  });

  it('accepts a disposal that says why', () => {
    const parsed = createInventoryMovementSchema.parse({
      type: 'disposal',
      quantity: 1,
      reason: 'broken',
      note: '  Pé da cadeira partiu  ',
    });

    expect(parsed.reason).toBe('broken');
    expect(parsed.note).toBe('Pé da cadeira partiu');
  });

  /* Campo em branco vira NULO: `''` no banco fingiria que a pessoa escreveu alguma coisa. */
  it('turns a blank note into nothing', () => {
    expect(createInventoryMovementSchema.parse({ type: 'out', quantity: 1, note: '' }).note).toBe(
      null,
    );
  });

  // triste
  /* Descarte sem motivo é só uma saída mal explicada — e é o motivo que o painel conta. */
  it('refuses a disposal without a reason, saying what to do', () => {
    const result = createInventoryMovementSchema.safeParse({ type: 'disposal', quantity: 1 });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Escolha o motivo do descarte');
  });

  it('refuses a quantity of zero, negative or broken', () => {
    expect(createInventoryMovementSchema.safeParse({ type: 'in', quantity: 0 }).success).toBe(
      false,
    );
    expect(createInventoryMovementSchema.safeParse({ type: 'in', quantity: -3 }).success).toBe(
      false,
    );
    expect(createInventoryMovementSchema.safeParse({ type: 'in', quantity: 1.5 }).success).toBe(
      false,
    );
  });

  it('refuses a movement that is none of the three', () => {
    expect(createInventoryMovementSchema.safeParse({ type: 'loan', quantity: 1 }).success).toBe(
      false,
    );
  });

  it('refuses a note longer than the limit', () => {
    const result = createInventoryMovementSchema.safeParse({
      type: 'in',
      quantity: 1,
      note: 'a'.repeat(INVENTORY_MOVEMENT_NOTE_MAX_LENGTH + 1),
    });

    expect(result.success).toBe(false);
  });
});

describe('inventoryMovementFormSchema', () => {
  const valid = { itemId: '3', type: 'out', quantity: '2', reason: '', note: '' } as const;

  // feliz
  it('accepts the form of an exit', () => {
    expect(inventoryMovementFormSchema.safeParse(valid).success).toBe(true);
  });

  // triste
  it('asks for the product', () => {
    const result = inventoryMovementFormSchema.safeParse({ ...valid, itemId: '' });

    expect(result.error?.issues[0]?.message).toBe('Escolha o produto');
  });

  it('asks for a whole quantity', () => {
    expect(inventoryMovementFormSchema.safeParse({ ...valid, quantity: '' }).success).toBe(false);
    expect(inventoryMovementFormSchema.safeParse({ ...valid, quantity: '2,5' }).success).toBe(
      false,
    );
    expect(inventoryMovementFormSchema.safeParse({ ...valid, quantity: '0' }).success).toBe(false);
  });

  it('asks for the reason only when it is a disposal', () => {
    const result = inventoryMovementFormSchema.safeParse({ ...valid, type: 'disposal' });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['reason']);
  });
});

describe('inventoryMovementListQuerySchema', () => {
  // feliz
  it('reads the product and the kind of movement from the address', () => {
    const parsed = inventoryMovementListQuerySchema.parse({ itemId: '7', type: 'disposal' });

    expect(parsed).toMatchObject({ itemId: 7, type: 'disposal', page: 1 });
  });

  // triste
  it('refuses a kind of movement that does not exist', () => {
    expect(inventoryMovementListQuerySchema.safeParse({ type: 'loan' }).success).toBe(false);
  });
});
