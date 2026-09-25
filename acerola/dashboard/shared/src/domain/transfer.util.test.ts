import { describe, expect, it } from 'vitest';

import {
  isRealTransfer,
  needsDestination,
  peripheralDestinyLabel,
  reserveDisplayNameOf,
} from './transfer.util';

describe('needsDestination', () => {
  // feliz
  it('asks where the peripheral stays', () => {
    expect(needsDestination('station')).toBe(true);
  });

  // triste
  /* O que vai junto não precisa de destino: ele continua na mesma máquina. */
  it('asks nothing when the peripheral goes along', () => {
    expect(needsDestination('machine')).toBe(false);
  });
});

describe('reserveDisplayNameOf', () => {
  // feliz
  /* O apelido do antigo dono mente no instante em que a máquina sai da mesa dele. */
  it('renames the machine that went back to the shelf', () => {
    expect(reserveDisplayNameOf('FINANCEIRO-02')).toBe('Reserva — FINANCEIRO-02');
  });
});

describe('isRealTransfer', () => {
  // feliz
  it('accepts a move between two departments', () => {
    expect(isRealTransfer('financeiro', 'fiscal')).toBe(true);
  });

  it('accepts sending a machine back to the shelf', () => {
    expect(isRealTransfer('financeiro', null)).toBe(true);
  });

  // triste
  /* Registrar um evento que não aconteceu é como um histórico deixa de valer. */
  it('refuses a move to the same department', () => {
    expect(isRealTransfer('financeiro', 'financeiro')).toBe(false);
    expect(isRealTransfer(null, null)).toBe(false);
  });
});

describe('peripheralDestinyLabel', () => {
  // feliz
  it('reads the choice in the words of who is carrying the machine', () => {
    expect(peripheralDestinyLabel('station')).toBe('Fica na estação');
  });
});
