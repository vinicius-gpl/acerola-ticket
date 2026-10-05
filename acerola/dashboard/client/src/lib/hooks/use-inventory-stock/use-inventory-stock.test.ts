import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-inventory-stock-harness.test.svelte';
import {
  stockItemsOf,
  type InventoryStockFilter,
  type InventoryStockModel,
} from './use-inventory-stock.svelte';

vi.mock('$lib/api/inventory-items.api', () => ({ inventoryItemsApi: { list: vi.fn() } }));

const { inventoryItemsApi } = await import('$lib/api/inventory-items.api');

function item(over: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 1,
    name: 'Café torrado e moído 500 g',
    category: 'pantry',
    unit: 'package',
    location: 'Copa',
    code: null,
    note: null,
    photoUrl: null,
    balance: 7,
    createdAt: '2026-09-01T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function page(items: InventoryItem[], total = items.length) {
  return { items, total, page: 1, pageSize: 200 };
}

function mountModel(): InventoryStockModel {
  let model!: InventoryStockModel;
  render(Harness, { props: { onReady: (ready: InventoryStockModel) => (model = ready) } });

  return model;
}

const emptyFilter: InventoryStockFilter = { search: '', category: '', outOfStockOnly: false };

const sugar = item({ id: 2, name: 'Açúcar refinado', balance: 0 });

beforeEach(() => {
  vi.mocked(inventoryItemsApi.list)
    .mockReset()
    .mockResolvedValue(page([item(), sugar]));
});

describe('stockItemsOf', () => {
  // feliz
  it('gives every product when the stock filter is off', () => {
    expect(stockItemsOf([item(), sugar], emptyFilter)).toHaveLength(2);
  });

  /* A lista de compras da semana: só o que zerou. */
  it('keeps only what ran out when the filter is on', () => {
    const visible = stockItemsOf([item(), sugar], { ...emptyFilter, outOfStockOnly: true });

    expect(visible.map((entry) => entry.id)).toEqual([2]);
  });

  // triste
  it('gives an empty list when nothing ran out', () => {
    expect(stockItemsOf([item()], { ...emptyFilter, outOfStockOnly: true })).toEqual([]);
  });
});

describe('useInventoryStockModel', () => {
  // feliz
  it('lists the products with how much there is of each, counting what ran out', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.items).toHaveLength(2));
    expect(model.data.items[0]?.balance).toBe(7);
    expect(model.data.outOfStock).toBe(1);
  });

  it('shows only what ran out, with the total of what was left', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.items).toHaveLength(2));

    model.actions.onOutOfStockOnlyChange(true);

    await waitFor(() => expect(model.data.items).toHaveLength(1));
    expect(model.data.total).toBe(1);
  });

  it('asks the API again with the search and the category', async () => {
    const model = mountModel();
    await waitFor(() => expect(inventoryItemsApi.list).toHaveBeenCalled());

    model.actions.onSearchChange('café');
    model.actions.onCategoryChange('pantry');

    await waitFor(() =>
      expect(inventoryItemsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'café', category: 'pantry' }),
      ),
    );
  });

  // triste
  /* Vazio só é vazio DEPOIS que a consulta terminou. */
  it('does not call the deposit empty while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });

  it('separates empty from hidden by a filter', async () => {
    vi.mocked(inventoryItemsApi.list).mockResolvedValue(page([item()]));
    const model = mountModel();
    await waitFor(() => expect(model.data.items).toHaveLength(1));

    model.actions.onOutOfStockOnlyChange(true);

    await waitFor(() => expect(model.state.isFilteredOut).toBe(true));
    expect(model.state.isEmpty).toBe(false);

    model.actions.onClearFilters();

    await waitFor(() => expect(model.state.isFilteredOut).toBe(false));
  });

  it('says when the list came shorter than what matched', async () => {
    vi.mocked(inventoryItemsApi.list).mockResolvedValue(page([item()], 300));
    const model = mountModel();

    await waitFor(() => expect(model.state.isTruncated).toBe(true));
  });

  it('shows the reason when the list fails', async () => {
    vi.mocked(inventoryItemsApi.list).mockRejectedValue(
      new ApiError(500, 'Não consegui falar com o servidor.'),
    );
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('Não consegui falar com o servidor.'));
  });
});
