import { type Computer } from '@template/shared/schemas/computer.schema';
import { type Part } from '@template/shared/schemas/part.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-movement-form-harness.test.svelte';
import { type MovementFormModel } from './use-movement-form.svelte';

vi.mock('$lib/api/parts.api', () => ({
  partsApi: { createMovement: vi.fn() },
}));

vi.mock('$lib/api/computers.api', () => ({
  computersApi: { list: vi.fn() },
}));

const { partsApi } = await import('$lib/api/parts.api');
const { computersApi } = await import('$lib/api/computers.api');

const GB = 1024 ** 3;

function computer(over: Partial<Computer> = {}): Computer {
  return {
    id: 3,
    name: 'CONTABIL-03',
    displayName: 'Contábil — mesa do fechamento',
    responsibleName: null,
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
    createdAt: '2026-05-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

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

function mountModel(
  props: { type?: 'in' | 'out'; onSaved?: () => void } = {},
): MovementFormModel {
  let model!: MovementFormModel;
  render(Harness, {
    props: { part, ...props, onReady: (ready: MovementFormModel) => (model = ready) },
  });

  return model;
}

describe('useMovementFormModel', () => {
  beforeEach(() => {
    vi.mocked(computersApi.list).mockResolvedValue({
      items: [computer(), computer({ id: 1, name: 'RECEPCAO-01', displayName: null })],
      total: 2,
      page: 1,
      pageSize: 200,
    });
    vi.mocked(partsApi.createMovement).mockResolvedValue({
      id: 10,
      partId: 1,
      partName: part.name,
      partCondition: 'new',
      type: 'out',
      quantity: 1,
      balanceAfter: 2,
      computerId: 3,
      computerName: 'CONTABIL-03',
      computerDisplayName: 'Contábil',
      computerDepartment: 'contabil',
      handledBy: null,
      note: null,
      createdAt: '2026-09-23T12:00:00.000Z',
      createdBy: 'suporte@azuos.local',
      updatedAt: null,
      updatedBy: null,
    });
  });

  // feliz
  it('starts at one, which is what a person takes from the shelf', () => {
    const model = mountModel();

    expect(model.data.fields.quantity.value).toBe('1');
  });

  it('offers the machines by the nickname, with the technical name along', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.machines).toHaveLength(2));
    expect(model.data.machines[0]?.label).toBe('Contábil — mesa do fechamento (CONTABIL-03)');
    expect(model.data.machines[1]?.label).toBe('RECEPCAO-01');
  });

  /* O tipo veio do botão, e vai para a API do jeito que ele disse. */
  it('sends the movement with the type the button chose', async () => {
    const model = mountModel({ type: 'in' });

    model.actions.onChange('quantity', '5');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(partsApi.createMovement).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ type: 'in', quantity: 5 }),
      ),
    );
  });

  it('sends no machine when none was chosen', async () => {
    const model = mountModel();

    model.actions.onSubmit();

    await waitFor(() =>
      expect(partsApi.createMovement).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ computerId: null }),
      ),
    );
  });

  // triste
  it('refuses a quantity of zero, without calling the API', async () => {
    const model = mountModel();

    model.actions.onChange('quantity', '0');
    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.quantity.error).not.toBeNull());
    expect(partsApi.createMovement).not.toHaveBeenCalled();
  });

  it('refuses a quantity typed with letters', async () => {
    const model = mountModel();

    model.actions.onChange('quantity', 'duas');
    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.quantity.error).not.toBeNull());
    expect(partsApi.createMovement).not.toHaveBeenCalled();
  });

  /* A recusa por falta de estoque chega pela API, e precisa aparecer na tela com o número. */
  it('shows why the stock did not cover the exit, keeping the form alive', async () => {
    vi.mocked(partsApi.createMovement).mockRejectedValue(
      new ApiError(422, 'Só há 3 de SSD 240 GB Kingston no depósito, e a saída é de 5.'),
    );
    const onSaved = vi.fn();
    const model = mountModel({ onSaved });

    model.actions.onChange('quantity', '5');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(model.state.error).toBe('Só há 3 de SSD 240 GB Kingston no depósito, e a saída é de 5.'),
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
});
