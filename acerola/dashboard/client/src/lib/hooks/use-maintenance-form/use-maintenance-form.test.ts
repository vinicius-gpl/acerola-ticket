import { type Computer } from '@template/shared/schemas/computer.schema';
import { type Maintenance } from '@template/shared/schemas/maintenance.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-maintenance-form-harness.test.svelte';
import { type MaintenanceFormModel } from './use-maintenance-form.svelte';

vi.mock('$lib/api/maintenances.api', () => ({
  maintenancesApi: { create: vi.fn(), update: vi.fn() },
}));

vi.mock('$lib/api/computers.api', () => ({
  computersApi: { list: vi.fn() },
}));

const { maintenancesApi } = await import('$lib/api/maintenances.api');
const { computersApi } = await import('$lib/api/computers.api');

const GB = 1024 ** 3;

function computer(over: Partial<Computer> = {}): Computer {
  return {
    id: 3,
    name: 'CONTABIL-03',
    displayName: 'Contábil — mesa do fechamento',
    responsibleName: 'Daniela Prado',
    department: 'contabil',
    hardware: {
      os: null,
      platform: null,
      platformVersion: null,
      kernelVersion: null,
      arch: null,
      cpuModel: null,
      logicalCpus: null,
      physicalCpus: null,
      totalMemoryBytes: 8 * GB,
      macAddress: null,
      localIp: null,
      totalDiskBytes: null,
      freeDiskBytes: null,
      uptimeSeconds: null,
      bootTime: null,
    },
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    isOnline: false,
    lastSeenAt: null,
    agentVersion: null,
    isArchived: false,
    isBlocked: false,
    blockReason: null,
    disposedAt: null,
    disposalType: null,
    disposalReason: null,
    createdAt: '2026-05-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function maintenance(over: Partial<Maintenance> = {}): Maintenance {
  return {
    id: 5,
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

function mountModel(
  props: { maintenance?: Maintenance | null; computerId?: number | null; onSaved?: () => void } = {},
): MaintenanceFormModel {
  let model!: MaintenanceFormModel;
  render(Harness, {
    props: { ...props, onReady: (ready: MaintenanceFormModel) => (model = ready) },
  });

  return model;
}

describe('useMaintenanceFormModel', () => {
  beforeEach(() => {
    vi.mocked(computersApi.list).mockResolvedValue({
      items: [computer(), computer({ id: 1, name: 'RECEPCAO-01', displayName: null })],
      total: 2,
      page: 1,
      pageSize: 200,
    });
    vi.mocked(maintenancesApi.create).mockResolvedValue(maintenance());
    vi.mocked(maintenancesApi.update).mockResolvedValue(maintenance());
  });

  // feliz
  it('offers the machines by the nickname people use, with the technical name along', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.machines).toHaveLength(2));
    expect(model.data.machines[0]?.label).toBe('Contábil — mesa do fechamento (CONTABIL-03)');
    expect(model.data.machines[1]?.label).toBe('RECEPCAO-01');
  });

  it('starts on the machine the reminder pointed at', () => {
    const model = mountModel({ computerId: 3 });

    expect(model.data.fields.computerId.value).toBe('3');
  });

  /* A data do campo é só AAAA-MM-DD. Assumir meia-noite faria o serviço feito no dia 20
     aparecer como dia 19 em qualquer fuso a oeste de Londres. */
  it('sends the service date at midday, so it never slips a day', async () => {
    const model = mountModel({ computerId: 3 });

    model.actions.onChange('performedAt', '2026-09-20');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(maintenancesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ performedAt: '2026-09-20T12:00:00.000Z' }),
      ),
    );
  });

  it('drops the hand-typed equipment when a machine was chosen', async () => {
    const model = mountModel({ computerId: 3 });

    model.actions.onChange('otherMachine', 'Impressora');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(maintenancesApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ computerId: 3, otherMachine: null }),
      ),
    );
  });

  it('edits the existing record instead of creating another one', async () => {
    const model = mountModel({ maintenance: maintenance() });

    model.actions.onChange('description', 'Troquei o cooler e a pasta térmica');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(maintenancesApi.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ description: 'Troquei o cooler e a pasta térmica' }),
      ),
    );
    expect(maintenancesApi.create).not.toHaveBeenCalled();
  });

  // triste
  /* Sem máquina e sem equipamento escrito o registro não diz de quem é — e o formulário
     recusa antes de chamar a API. */
  it('refuses a record that names no equipment, without calling the API', async () => {
    const model = mountModel();

    model.actions.onChange('computerId', '');
    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.otherMachine.error).not.toBeNull());
    expect(maintenancesApi.create).not.toHaveBeenCalled();
  });

  it('shows why the server refused, keeping the form alive', async () => {
    vi.mocked(maintenancesApi.create).mockRejectedValue(
      new ApiError(422, 'A máquina escolhida não existe mais.'),
    );
    const onSaved = vi.fn();
    const model = mountModel({ computerId: 3, onSaved });

    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toBe('A máquina escolhida não existe mais.'));
    expect(onSaved).not.toHaveBeenCalled();
  });
});
