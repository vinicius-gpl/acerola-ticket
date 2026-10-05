import { describe, expect, it } from 'vitest';

import { type InventoryItemRow } from '../../../lib/db/schema/inventory-items.schema';
import {
  toInventoryItem,
  toInventoryItemInsert,
  toInventoryItemUpdate,
} from './inventory-items.mapper';

function row(overrides: Partial<InventoryItemRow> = {}): InventoryItemRow {
  return {
    id: 1,
    name: 'Cadeira de escritório',
    category: 'furniture',
    unit: 'unit',
    location: 'Sala da contabilidade',
    code: 'PAT-0042',
    note: null,
    photoKey: 'inventory/abc.webp',
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

describe('toInventoryItem', () => {
  // feliz
  it('translates the row into the contract, with the signed photo link', () => {
    const item = toInventoryItem(row(), 'https://r2.exemplo/foto?assinatura');

    expect(item.name).toBe('Cadeira de escritório');
    expect(item.photoUrl).toBe('https://r2.exemplo/foto?assinatura');
    expect(item.createdAt).toBe('2026-09-01T12:00:00.000Z');
  });

  // triste
  /* A CHAVE do arquivo nunca sai do servidor: o que a tela recebe é o link temporário, e
     quando não há link, não há foto. */
  it('never leaks the storage key when there is no link', () => {
    const item = toInventoryItem(row(), null);

    expect(item.photoUrl).toBeNull();
    expect(JSON.stringify(item)).not.toContain('inventory/abc.webp');
  });
});

describe('toInventoryItemInsert', () => {
  // feliz
  it('stamps the authorship from the identity, never from the body', () => {
    const values = toInventoryItemInsert(
      { name: 'Café em pó', category: 'pantry', unit: 'package' },
      'ana@empresa.com.br',
      null,
    );

    expect(values.createdBy).toBe('ana@empresa.com.br');
    expect(values.photoKey).toBeNull();
  });

  it('trims the name and keeps the photo that was stored', () => {
    const values = toInventoryItemInsert(
      { name: '  Mesa  ', category: 'furniture', unit: 'unit' },
      'ana@empresa.com.br',
      'inventory/nova.webp',
    );

    expect(values.name).toBe('Mesa');
    expect(values.photoKey).toBe('inventory/nova.webp');
  });

  // triste
  /* Campo em branco vira nulo: `''` no banco fingiria que alguém escreveu alguma coisa. */
  it('turns the blank optional fields into nothing', () => {
    const values = toInventoryItemInsert(
      { name: 'Vassoura', category: 'cleaning', unit: 'unit', location: '   ', note: '' },
      'ana@empresa.com.br',
      null,
    );

    expect(values.location).toBeNull();
    expect(values.note).toBeNull();
  });
});

describe('toInventoryItemUpdate', () => {
  // feliz
  /* Só o que veio muda: sem isso, editar o nome apagaria a observação. */
  it('changes only the fields that came', () => {
    const values = toInventoryItemUpdate({ name: 'Cadeira nova' }, 'bia@empresa.com.br');

    expect(values.name).toBe('Cadeira nova');
    expect(values).not.toHaveProperty('location');
    expect(values.updatedBy).toBe('bia@empresa.com.br');
  });

  it('replaces the photo when a new one was stored', () => {
    const values = toInventoryItemUpdate({}, 'bia@empresa.com.br', 'inventory/nova.webp');

    expect(values.photoKey).toBe('inventory/nova.webp');
  });

  // triste
  /* Tirar a foto é uma ORDEM explícita: sem ela, nenhuma edição apaga imagem por engano. */
  it('clears the photo only when asked to', () => {
    expect(toInventoryItemUpdate({}, 'bia@empresa.com.br')).not.toHaveProperty('photoKey');
    expect(toInventoryItemUpdate({ removePhoto: true }, 'bia@empresa.com.br').photoKey).toBeNull();
  });

  /* A ordem de tirar vence a foto nova: quem marcou "remover" não quer imagem nenhuma. */
  it('prefers removing over replacing when both arrive (edge case)', () => {
    const values = toInventoryItemUpdate(
      { removePhoto: true },
      'bia@empresa.com.br',
      'inventory/nova.webp',
    );

    expect(values.photoKey).toBeNull();
  });
});
