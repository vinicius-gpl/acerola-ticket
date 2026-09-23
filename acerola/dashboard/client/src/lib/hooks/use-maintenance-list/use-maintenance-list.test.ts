import { type Maintenance } from '@template/shared/schemas/maintenance.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-maintenance-list-harness.test.svelte';
import { type MaintenanceListModel } from './use-maintenance-list.svelte';

vi.mock('$lib/api/maintenances.api', () => ({
  maintenancesApi: { list: vi.fn(), preventive: vi.fn(), remove: vi.fn() },
}));

const { maintenancesApi } = await import('$lib/api/maintenances.api');

function maintenance(over: Partial<Maintenance> = {}): Maintenance {
  return {
    id: 1,
    computerId: 3,
    computerName: 'CONTABIL-03',
    computerDisplayName: 'Contábil — mesa do fechamento',
    computerDepartment: 'contabil',
    otherMachine: null,
    type: 'corrective',
    description: 'Cooler substituído.',
    performedBy: 'Suporte TI',
    performedAt: '2026-09-20T12:00:00.000Z',
    createdAt: '2026-09-20T13:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function page(items: Maintenance[], total = items.length) {
  return { items, total, page: 1, pageSize: 200 };
}

/** Monta o model. O objeto devolvido tem getters, então continua vivo enquanto o teste roda. */
function mountModel(): MaintenanceListModel {
  let model!: MaintenanceListModel;
  render(Harness, { props: { onReady: (ready: MaintenanceListModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<MaintenanceListModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('useMaintenanceListModel', () => {
  beforeEach(() => {
    vi.mocked(maintenancesApi.list).mockResolvedValue(page([maintenance()]));
    vi.mocked(maintenancesApi.preventive).mockResolvedValue([]);
    vi.mocked(maintenancesApi.remove).mockResolvedValue(undefined);
  });

  // feliz
  it('brings the history translated into the contract', async () => {
    const model = await mountLoadedModel();

    expect(model.data.maintenances).toHaveLength(1);
    expect(model.data.maintenances[0]?.computerName).toBe('CONTABIL-03');
  });

  it('asks the API again when the type filter changes', async () => {
    const model = await mountLoadedModel();

    model.actions.onTypeChange('preventive');

    await waitFor(() =>
      expect(maintenancesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'preventive' }),
      ),
    );
  });

  /* Excluir só acontece depois da confirmação: perguntar e já apagar é o mesmo que não
     perguntar. */
  it('does not delete anything until the question is answered', async () => {
    const model = await mountLoadedModel();

    model.actions.onAskRemove(maintenance());
    expect(maintenancesApi.remove).not.toHaveBeenCalled();
    expect(model.data.removing?.id).toBe(1);

    model.actions.onConfirmRemove();

    await waitFor(() => expect(maintenancesApi.remove).toHaveBeenCalledWith(1));
  });

  it('closes the question when the person gives up', async () => {
    const model = await mountLoadedModel();

    model.actions.onAskRemove(maintenance());
    model.actions.onCancelRemove();

    expect(model.data.removing).toBeNull();
    expect(maintenancesApi.remove).not.toHaveBeenCalled();
  });

  // triste
  it('hands the screen the reason the history did not load', async () => {
    vi.mocked(maintenancesApi.list).mockRejectedValue(new ApiError(500, 'O servidor tropeçou.'));

    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O servidor tropeçou.'));
  });

  /* A falha de EXCLUIR é separada da falha de carregar: a lista continua na tela. */
  it('keeps the list on screen when the delete is refused', async () => {
    vi.mocked(maintenancesApi.remove).mockRejectedValue(
      new ApiError(403, 'Este registro é de outra pessoa.'),
    );

    const model = await mountLoadedModel();
    model.actions.onAskRemove(maintenance());
    model.actions.onConfirmRemove();

    await waitFor(() =>
      expect(model.state.actionError).toBe('Este registro é de outra pessoa.'),
    );
    expect(model.data.maintenances).toHaveLength(1);
    expect(model.state.error).toBeNull();
  });

  it('separates an empty history from a filter that hid everything', async () => {
    vi.mocked(maintenancesApi.list).mockResolvedValue(page([]));

    const model = await mountLoadedModel();
    expect(model.state.isEmpty).toBe(true);

    model.actions.onSearchChange('impressora');

    await waitFor(() => expect(model.state.isFilteredOut).toBe(true));
    expect(model.state.isEmpty).toBe(false);
  });

  /* Vazio só é vazio DEPOIS que a consulta terminou. */
  it('does not call the history empty while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });
});
