import { describe, expect, it } from 'vitest';

import { type PartMovementRow } from '../../../lib/db/schema/part-movements.schema';
import { type PartRow } from '../../../lib/db/schema/parts.schema';
import { type MovementWithRefs } from '../repository/parts.repository';
import { toMovement, toMovementUpdate, toPart, toPartInsert, toPartUpdate } from './parts.mapper';

const ANA = 'ana@empresa.com.br';

function partRow(overrides: Partial<PartRow> = {}): PartRow {
  return {
    id: 1,
    name: 'SSD 240 GB Kingston',
    category: 'ssd',
    condition: 'new',
    balance: 4,
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    createdBy: ANA,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function movementRow(overrides: Partial<PartMovementRow> = {}): PartMovementRow {
  return {
    id: 10,
    partId: 1,
    type: 'out',
    quantity: 1,
    balanceAfter: 3,
    computerId: 3,
    handledBy: 'Suporte TI',
    note: null,
    createdAt: new Date('2026-09-20T12:00:00.000Z'),
    createdBy: ANA,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function withRefs(overrides: Partial<MovementWithRefs> = {}): MovementWithRefs {
  return {
    movement: movementRow(),
    part: { id: 1, name: 'SSD 240 GB Kingston', condition: 'new' },
    computer: { id: 3, name: 'CONTABIL-03', displayName: 'Contábil', department: 'contabil' },
    ...overrides,
  };
}

describe('toPart', () => {
  // feliz
  it('hands the screen dates it can read', () => {
    expect(toPart(partRow()).createdAt).toBe('2026-09-01T12:00:00.000Z');
  });
});

describe('toPartInsert', () => {
  // feliz
  /* O saldo nasce em zero e só se move por movimentação: é o que garante que todo número da
     prateleira tenha uma linha que o explique. */
  it('starts every part at zero, whatever the body says', () => {
    const insert = toPartInsert(
      { name: '  Mouse  ', category: 'mouse', condition: 'used', initialQuantity: 9 },
      ANA,
    );

    expect(insert.balance).toBe(0);
    expect(insert.name).toBe('Mouse');
  });

  // triste
  it('never takes the author from the body', () => {
    const insert = toPartInsert(
      { name: 'Mouse', category: 'mouse', condition: 'new', createdBy: 'bia@empresa.com.br' } as never,
      ANA,
    );

    expect(insert.createdBy).toBe(ANA);
  });
});

describe('toPartUpdate', () => {
  // feliz
  it('touches only what came in the body', () => {
    const update = toPartUpdate({ name: 'SSD 480 GB' }, ANA);

    expect(update.name).toBe('SSD 480 GB');
    expect(update).not.toHaveProperty('category');
    expect(update.updatedBy).toBe(ANA);
  });

  // triste
  it('never lets the balance in through the update', () => {
    expect(toPartUpdate({ balance: 99 } as never, ANA)).not.toHaveProperty('balance');
  });
});

describe('toMovement', () => {
  // feliz
  it('reads the part and the machine from their own tables', () => {
    const movement = toMovement(withRefs());

    expect(movement.partName).toBe('SSD 240 GB Kingston');
    expect(movement.computerName).toBe('CONTABIL-03');
    expect(movement.balanceAfter).toBe(3);
  });

  // triste
  /* Movimentação sem máquina é o caso normal (peça que entrou no depósito), e não falta
     de dado. */
  it('leaves the machine empty when the movement has none', () => {
    const movement = toMovement({
      ...withRefs(),
      movement: movementRow({ computerId: null }),
      computer: null,
    });

    expect(movement.computerId).toBeNull();
    expect(movement.computerName).toBeNull();
  });
});

describe('toMovementUpdate', () => {
  // feliz
  it('fixes who took it and the note', () => {
    const update = toMovementUpdate({ handledBy: 'Bia', note: 'Sala 3' }, ANA);

    expect(update.handledBy).toBe('Bia');
    expect(update.note).toBe('Sala 3');
  });

  // triste
  /* Quantidade e tipo reescreveriam o saldo de todas as linhas seguintes do extrato. */
  it('refuses to carry quantity or type into the update', () => {
    const update = toMovementUpdate({ quantity: 10, type: 'in' } as never, ANA);

    expect(update).not.toHaveProperty('quantity');
    expect(update).not.toHaveProperty('type');
  });
});
