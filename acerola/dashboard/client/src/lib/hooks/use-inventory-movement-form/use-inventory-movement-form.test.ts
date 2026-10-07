import { type StockMovementType } from '@template/shared/domain/inventory-stock.util';
import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-inventory-movement-form-harness.test.svelte';
import { type InventoryMovementFormModel } from './use-inventory-movement-form.svelte';

vi.mock('$lib/api/inventory-items.api', () => ({
  inventoryItemsApi: { list: vi.fn(), createMovement: vi.fn() },
}));

const { inventoryItemsApi } = await import('$lib/api/inventory-items.api');

function item(over: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 4,
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

function mountModel(
  type: StockMovementType,
  existing: InventoryItem | null,
  onSaved: () => void = vi.fn(),
): InventoryMovementFormModel {
  let model!: InventoryMovementFormModel;
  render(Harness, {
    props: {
      type,
      item: existing,
      onSaved,
      onReady: (ready: InventoryMovementFormModel) => (model = ready),
    },
  });

  return model;
}

beforeEach(() => {
  vi.mocked(inventoryItemsApi.list)
    .mockReset()
    .mockResolvedValue({
      items: [item(), item({ id: 9, name: 'Lâmpada LED', balance: 2 })],
      total: 2,
      page: 1,
      pageSize: 200,
    });
  vi.mocked(inventoryItemsApi.createMovement).mockReset().mockResolvedValue({
    id: 1,
    itemId: 4,
    itemName: 'Café torrado e moído 500 g',
    itemUnit: 'package',
    type: 'in',
    quantity: 3,
    balanceAfter: 10,
    reason: null,
    note: null,
    createdAt: '2026-10-05T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
  });
});

describe('useInventoryMovementFormModel', () => {
  // feliz
  it('opens on the product that came chosen, showing how much there is', () => {
    const model = mountModel('in', item());

    expect(model.data.product).toEqual({
      name: 'Café torrado e moído 500 g',
      balance: 7,
      unitLabel: 'Pacote',
    });
    /* Com o produto na mão não há o que escolher — nem ida ao servidor para listar. */
    expect(model.data.productOptions).toEqual([]);
    expect(inventoryItemsApi.list).not.toHaveBeenCalled();
  });

  it('registers the entry of the chosen product', async () => {
    const onSaved = vi.fn();
    const model = mountModel('in', item(), onSaved);

    model.actions.onChange('quantity', '3');
    model.actions.onChange('note', 'Compra do mês');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(inventoryItemsApi.createMovement).toHaveBeenCalledWith(4, {
        type: 'in',
        quantity: 3,
        reason: null,
        note: 'Compra do mês',
      }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });

  /* No Descarte é a pessoa quem diz de qual produto está falando. */
  it('offers the products to choose from when none came chosen', async () => {
    const model = mountModel('disposal', null);

    await waitFor(() => expect(model.data.productOptions).toHaveLength(2));
    expect(model.data.product).toBeNull();

    model.actions.onChange('itemId', '9');

    await waitFor(() => expect(model.data.product?.name).toBe('Lâmpada LED'));
  });

  it('registers a disposal with its reason', async () => {
    const model = mountModel('disposal', item());

    model.actions.onChange('quantity', '1');
    model.actions.onChange('reason', 'expired');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(inventoryItemsApi.createMovement).toHaveBeenCalledWith(
        4,
        expect.objectContaining({ type: 'disposal', reason: 'expired' }),
      ),
    );
  });

  // triste
  it('does not send a movement without a quantity, and says what is missing', async () => {
    const model = mountModel('out', item());

    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.quantity.error).toBe('Informe a quantidade'));
    expect(inventoryItemsApi.createMovement).not.toHaveBeenCalled();
  });

  it('does not send a disposal without a reason', async () => {
    const model = mountModel('disposal', item());

    model.actions.onChange('quantity', '1');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(model.data.fields.reason.error).toBe('Escolha o motivo do descarte'),
    );
    expect(inventoryItemsApi.createMovement).not.toHaveBeenCalled();
  });

  /* A recusa que só o servidor sabe dar fica NA TELA, e o diálogo não fecha. */
  it('shows the refusal of the server and does not close', async () => {
    vi.mocked(inventoryItemsApi.createMovement).mockRejectedValue(
      new ApiError(422, 'Só há 7 de Café no depósito, e o movimento é de 9.'),
    );
    const onSaved = vi.fn();
    const model = mountModel('out', item(), onSaved);

    model.actions.onChange('quantity', '9');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(model.state.error).toBe('Só há 7 de Café no depósito, e o movimento é de 9.'),
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
});
