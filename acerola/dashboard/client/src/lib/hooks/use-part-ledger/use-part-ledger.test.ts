import { type Part, type PartMovement } from '@template/shared/schemas/part.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-part-ledger-harness.test.svelte';
import { type PartLedgerModel } from './use-part-ledger.svelte';

vi.mock('$lib/api/parts.api', () => ({
  partsApi: { movements: vi.fn(), removeMovement: vi.fn() },
}));

const { partsApi } = await import('$lib/api/parts.api');

const part: Part = {
  id: 1,
  name: 'SSD 240 GB Kingston',
  category: 'ssd',
  condition: 'new',
  balance: 3,
  createdAt: '2026-09-01T12:00:00.000Z',
  createdBy: 'suporte@azuos.local',
  updatedAt: null,
  updatedBy: null,
};

function movement(over: Partial<PartMovement> = {}): PartMovement {
  return {
    id: 10,
    partId: 1,
    partName: part.name,
    partCondition: 'new',
    type: 'out',
    quantity: 1,
    balanceAfter: 3,
    computerId: null,
    computerName: null,
    computerDisplayName: null,
    computerDepartment: null,
    handledBy: null,
    note: null,
    createdAt: '2026-09-20T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function mountModel(): PartLedgerModel {
  let model!: PartLedgerModel;
  render(Harness, { props: { part, onReady: (ready: PartLedgerModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<PartLedgerModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('usePartLedgerModel', () => {
  beforeEach(() => {
    vi.mocked(partsApi.movements).mockResolvedValue({
      items: [movement()],
      total: 1,
      page: 1,
      pageSize: 100,
    });
    vi.mocked(partsApi.removeMovement).mockResolvedValue(undefined);
  });

  // feliz
  it('asks only for the movements of this part', async () => {
    await mountLoadedModel();

    expect(partsApi.movements).toHaveBeenCalledWith(expect.objectContaining({ partId: 1 }));
  });

  /* Excluir só acontece depois da confirmação: perguntar e já apagar é não perguntar. */
  it('does not delete anything until the question is answered', async () => {
    const model = await mountLoadedModel();

    model.actions.onAskRemove(movement());
    expect(partsApi.removeMovement).not.toHaveBeenCalled();
    expect(model.data.removing?.id).toBe(10);

    model.actions.onConfirmRemove();

    await waitFor(() => expect(partsApi.removeMovement).toHaveBeenCalledWith(10));
  });

  it('closes the question when the person gives up', async () => {
    const model = await mountLoadedModel();

    model.actions.onAskRemove(movement());
    model.actions.onCancelRemove();

    expect(model.data.removing).toBeNull();
    expect(partsApi.removeMovement).not.toHaveBeenCalled();
  });

  // triste
  it('hands the screen the reason the ledger did not load', async () => {
    vi.mocked(partsApi.movements).mockRejectedValue(new ApiError(500, 'O servidor tropeçou.'));

    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O servidor tropeçou.'));
  });

  /* A falha de EXCLUIR é separada da falha de carregar: o extrato continua na tela. */
  it('keeps the ledger on screen when the delete is refused', async () => {
    vi.mocked(partsApi.removeMovement).mockRejectedValue(
      new ApiError(403, 'Esta movimentação é de outra pessoa.'),
    );

    const model = await mountLoadedModel();
    model.actions.onAskRemove(movement());
    model.actions.onConfirmRemove();

    await waitFor(() =>
      expect(model.state.actionError).toBe('Esta movimentação é de outra pessoa.'),
    );
    expect(model.data.movements).toHaveLength(1);
    expect(model.state.error).toBeNull();
  });

  it('does not call the ledger empty while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });
});
