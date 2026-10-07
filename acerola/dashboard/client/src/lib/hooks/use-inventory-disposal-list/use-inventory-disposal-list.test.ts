import { type InventoryMovement } from '@template/shared/schemas/inventory-movement.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-inventory-disposal-list-harness.test.svelte';
import { disposalsOf, type InventoryDisposalListModel } from './use-inventory-disposal-list.svelte';

vi.mock('$lib/api/inventory-items.api', () => ({ inventoryItemsApi: { movements: vi.fn() } }));

const { inventoryItemsApi } = await import('$lib/api/inventory-items.api');

function disposal(over: Partial<InventoryMovement> = {}): InventoryMovement {
  return {
    id: 1,
    itemId: 1,
    itemName: 'Cadeira giratória',
    itemUnit: 'unit',
    type: 'disposal',
    quantity: 1,
    balanceAfter: 5,
    reason: 'broken',
    note: 'Base rachou; sem conserto.',
    createdAt: '2026-09-15T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    ...over,
  };
}

const expired = disposal({ id: 2, itemName: 'Café', quantity: 3, reason: 'expired' });

function page(items: InventoryMovement[], total = items.length) {
  return { items, total, page: 1, pageSize: 200 };
}

function mountModel(): InventoryDisposalListModel {
  let model!: InventoryDisposalListModel;
  render(Harness, { props: { onReady: (ready: InventoryDisposalListModel) => (model = ready) } });

  return model;
}

beforeEach(() => {
  vi.mocked(inventoryItemsApi.movements)
    .mockReset()
    .mockResolvedValue(page([disposal(), expired]));
});

describe('disposalsOf', () => {
  // feliz
  it('gives every disposal when no reason is chosen', () => {
    expect(disposalsOf([disposal(), expired], { reason: '' })).toHaveLength(2);
  });

  it('keeps only the disposals of the chosen reason', () => {
    expect(disposalsOf([disposal(), expired], { reason: 'expired' }).map((d) => d.id)).toEqual([2]);
  });

  // triste
  it('gives an empty list when nothing was discarded for that reason', () => {
    expect(disposalsOf([disposal()], { reason: 'lost' })).toEqual([]);
  });
});

describe('useInventoryDisposalListModel', () => {
  // feliz
  it('asks the statement only for the disposals', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.disposals).toHaveLength(2));
    expect(inventoryItemsApi.movements).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'disposal' }),
    );
  });

  /* O número que importa é quantas UNIDADES saíram, não quantas linhas existem. */
  it('adds up the units that were discarded', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.units).toBe(4));
    expect(model.data.total).toBe(2);
  });

  it('filters by reason without going back to the server', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.disposals).toHaveLength(2));

    model.actions.onReasonChange('expired');

    await waitFor(() => expect(model.data.disposals).toHaveLength(1));
    expect(model.data.units).toBe(3);
    expect(model.data.total).toBe(1);
    expect(inventoryItemsApi.movements).toHaveBeenCalledOnce();
  });

  // triste
  /* Vazio só é vazio DEPOIS que a consulta terminou. */
  it('does not say nothing was discarded while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });

  it('separates empty from hidden by the reason filter', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.disposals).toHaveLength(2));

    model.actions.onReasonChange('lost');

    await waitFor(() => expect(model.state.isFilteredOut).toBe(true));
    expect(model.state.isEmpty).toBe(false);

    model.actions.onClearFilters();

    await waitFor(() => expect(model.state.isFilteredOut).toBe(false));
  });

  it('calls it empty when nothing was ever discarded', async () => {
    vi.mocked(inventoryItemsApi.movements).mockResolvedValue(page([]));
    const model = mountModel();

    await waitFor(() => expect(model.state.isEmpty).toBe(true));
  });

  it('shows the reason when the list fails', async () => {
    vi.mocked(inventoryItemsApi.movements).mockRejectedValue(
      new ApiError(500, 'Não consegui falar com o servidor.'),
    );
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('Não consegui falar com o servidor.'));
  });
});
