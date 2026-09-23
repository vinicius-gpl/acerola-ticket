import { describe, expect, it } from 'vitest';

import {
  createMovementSchema,
  createPartSchema,
  movementFormSchema,
  partFormSchema,
  partListQuerySchema,
  updateMovementSchema,
  updatePartSchema,
} from './part.schema';

describe('createPartSchema', () => {
  // feliz
  it('accepts a part with nothing but what it is', () => {
    const parsed = createPartSchema.parse({
      name: '  SSD 240 GB Kingston  ',
      category: 'ssd',
      condition: 'new',
    });

    expect(parsed.name).toBe('SSD 240 GB Kingston');
    expect(parsed.initialQuantity).toBeUndefined();
  });

  it('accepts the quantity already on the shelf', () => {
    expect(
      createPartSchema.parse({ name: 'Mouse', category: 'mouse', condition: 'used', initialQuantity: 4 })
        .initialQuantity,
    ).toBe(4);
  });

  // triste
  it('refuses a part with no description', () => {
    expect(
      createPartSchema.safeParse({ name: '   ', category: 'ssd', condition: 'new' }).success,
    ).toBe(false);
  });

  it('refuses a category that is not on the shelf list', () => {
    expect(
      createPartSchema.safeParse({ name: 'Placa mãe', category: 'motherboard', condition: 'new' })
        .success,
    ).toBe(false);
  });

  /* Quantidade negativa entraria como saldo negativo antes de qualquer movimentação. */
  it('refuses a negative starting quantity', () => {
    expect(
      createPartSchema.safeParse({
        name: 'Mouse',
        category: 'mouse',
        condition: 'new',
        initialQuantity: -2,
      }).success,
    ).toBe(false);
  });
});

describe('updatePartSchema', () => {
  // feliz
  it('accepts fixing only the description', () => {
    const parsed = updatePartSchema.parse({ name: 'SSD 480 GB Kingston' });

    expect(parsed.name).toBe('SSD 480 GB Kingston');
    expect(parsed.category).toBeUndefined();
  });

  // triste
  /* O saldo é a soma do histórico. Digitá-lo faria o número discordar das linhas que o
     explicam, e ninguém saberia qual dos dois acreditar. */
  it('refuses to have the balance typed in', () => {
    const parsed = updatePartSchema.parse({ balance: 99, name: 'Mouse' });

    expect(parsed).not.toHaveProperty('balance');
  });
});

describe('createMovementSchema', () => {
  // feliz
  it('accepts a part going out to a machine', () => {
    const parsed = createMovementSchema.parse({
      type: 'out',
      quantity: 1,
      computerId: 3,
      handledBy: 'Suporte TI',
      note: 'Trocado o disco da contábil',
    });

    expect(parsed.type).toBe('out');
    expect(parsed.computerId).toBe(3);
  });

  it('accepts a movement with no machine attached', () => {
    expect(createMovementSchema.parse({ type: 'in', quantity: 5 }).computerId).toBeUndefined();
  });

  // triste
  it('refuses a movement of zero, which moves nothing', () => {
    expect(createMovementSchema.safeParse({ type: 'in', quantity: 0 }).success).toBe(false);
  });

  it('refuses a negative quantity, which would be the other movement', () => {
    expect(createMovementSchema.safeParse({ type: 'out', quantity: -3 }).success).toBe(false);
  });

  /* Dedo escorregado no teclado numérico não pode virar mil monitores na prateleira. */
  it('refuses a quantity beyond what a storeroom holds', () => {
    expect(createMovementSchema.safeParse({ type: 'in', quantity: 5000 }).success).toBe(false);
  });
});

describe('updateMovementSchema', () => {
  // feliz
  it('accepts fixing who took it and the note', () => {
    const parsed = updateMovementSchema.parse({ handledBy: 'Bia', note: 'Entregue na sala 3' });

    expect(parsed.handledBy).toBe('Bia');
  });

  // triste
  /* Mudar a quantidade reescreveria o saldo de todas as linhas seguintes do extrato.
     Movimentação lançada errada se exclui, e a exclusão devolve o saldo. */
  it('refuses to change the quantity or the type of a movement already recorded', () => {
    const parsed = updateMovementSchema.parse({ quantity: 10, type: 'in', note: 'oi' });

    expect(parsed).not.toHaveProperty('quantity');
    expect(parsed).not.toHaveProperty('type');
  });
});

describe('partFormSchema', () => {
  const FORM = { name: 'SSD 240 GB', category: 'ssd' as const, condition: 'new' as const };

  // feliz
  it('accepts the form with the quantity left blank', () => {
    expect(partFormSchema.safeParse({ ...FORM, initialQuantity: '' }).success).toBe(true);
  });

  // triste
  it('refuses a quantity typed with letters', () => {
    expect(partFormSchema.safeParse({ ...FORM, initialQuantity: 'duas' }).success).toBe(false);
  });
});

describe('movementFormSchema', () => {
  const FORM = {
    type: 'out' as const,
    quantity: '1',
    computerId: '3',
    handledBy: 'Suporte TI',
    note: '',
  };

  // feliz
  it('accepts the form as the screen fills it', () => {
    expect(movementFormSchema.safeParse(FORM).success).toBe(true);
  });

  // triste
  it('refuses an empty quantity', () => {
    expect(movementFormSchema.safeParse({ ...FORM, quantity: '' }).success).toBe(false);
  });

  it('refuses a quantity of zero', () => {
    expect(movementFormSchema.safeParse({ ...FORM, quantity: '0' }).success).toBe(false);
  });
});

describe('partListQuerySchema', () => {
  // feliz
  it('fills in the default page when the screen sends no filter', () => {
    expect(partListQuerySchema.parse({}).page).toBe(1);
  });

  it('reads the in-stock filter that comes from the address as text', () => {
    expect(partListQuerySchema.parse({ inStockOnly: 'true' }).inStockOnly).toBe(true);
  });

  // triste
  it('refuses a page size above the ceiling', () => {
    expect(partListQuerySchema.safeParse({ pageSize: 5000 }).success).toBe(false);
  });
});
