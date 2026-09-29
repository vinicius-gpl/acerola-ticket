import { type Computer } from '@template/shared/schemas/computer.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-computer-form-harness.test.svelte';
import { type ComputerFormModel, type CreatedAgentToken } from './use-computer-form.svelte';

vi.mock('$lib/api/computers.api', () => ({
  computersApi: { create: vi.fn(), update: vi.fn() },
}));

const { computersApi } = await import('$lib/api/computers.api');

const GB = 1024 ** 3;

function computer(over: Partial<Computer> = {}): Computer {
  return {
    id: 1,
    name: 'RECEPCAO-01',
    displayName: 'Recepção — balcão',
    responsibleName: 'Bia Costa',
    department: 'recepcao',
    hardware: {
      os: 'Microsoft Windows 11 Pro',
      platform: 'windows',
      platformVersion: '10.0.26100',
      kernelVersion: '10.0.26100',
      arch: 'amd64',
      cpuModel: 'Intel Core i5-12400',
      logicalCpus: 12,
      physicalCpus: 6,
      totalMemoryBytes: 16 * GB,
      macAddress: '00:00:5E:00:53:01',
      localIp: '198.51.100.11',
      totalDiskBytes: 480 * GB,
      freeDiskBytes: 210 * GB,
      uptimeSeconds: 3600,
      bootTime: '2026-09-23T09:00:00.000Z',
    },
    healthScore: 100,
    healthStatus: 'good',
    warnings: [],
    isOnline: true,
    lastSeenAt: '2026-09-23T11:58:00.000Z',
    agentVersion: '1.0.0',
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

function mountModel(
  props: { computer?: Computer | null; onSaved?: (created: CreatedAgentToken | null) => void } = {},
): ComputerFormModel {
  let model!: ComputerFormModel;
  render(Harness, {
    props: { ...props, onReady: (ready: ComputerFormModel) => (model = ready) },
  });

  return model;
}

describe('useComputerFormModel', () => {
  beforeEach(() => {
    vi.mocked(computersApi.create).mockResolvedValue({
      computer: computer(),
      token: 'agt_novo',
    });
    vi.mocked(computersApi.update).mockResolvedValue(computer());
  });

  // feliz
  it('registers the machine and hands the token back, once', async () => {
    const onSaved = vi.fn();
    const model = mountModel({ onSaved });

    model.actions.onChange('name', 'RECEPCAO-01');
    model.actions.onChange('responsibleName', 'Bia Costa');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith({ token: 'agt_novo', computerName: 'RECEPCAO-01' }),
    );
  });

  /* Campo em branco vira nulo: "sem responsável" e "responsável chamado nada" são coisas
     diferentes, e só a primeira existe. */
  it('saves a blank field as absent, not as an empty name', async () => {
    const model = mountModel();

    model.actions.onChange('name', 'FISCAL-04');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(computersApi.create).toHaveBeenCalledWith({
        name: 'FISCAL-04',
        displayName: null,
        responsibleName: null,
        department: null,
      }),
    );
  });

  /* Na edição o nome NÃO é enviado: quem o informa é a própria máquina. */
  it('never sends the machine name when editing an existing record', async () => {
    const model = mountModel({ computer: computer() });

    model.actions.onChange('displayName', 'Recepção — balcão novo');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(computersApi.update).toHaveBeenCalledWith(1, {
        displayName: 'Recepção — balcão novo',
        responsibleName: 'Bia Costa',
        department: 'recepcao',
      }),
    );
  });

  // triste
  it('refuses to register a machine with no name, without calling the API', async () => {
    const model = mountModel();

    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.name.error).toBe('Informe o nome da máquina'));
    expect(computersApi.create).not.toHaveBeenCalled();
  });

  /* O erro precisa SUMIR quando o campo é corrigido: preso, ele faria a pessoa achar que o
     formulário quebrou. */
  it('clears the field error once the name is typed', async () => {
    const model = mountModel();

    model.actions.onSubmit();
    await waitFor(() => expect(model.data.fields.name.error).not.toBeNull());

    model.actions.onChange('name', 'RECEPCAO-01');

    await waitFor(() => expect(model.data.fields.name.error).toBeNull());
  });

  it('shows why the server refused, keeping the form alive', async () => {
    vi.mocked(computersApi.create).mockRejectedValue(
      new ApiError(409, 'Já existe uma máquina com esse nome.'),
    );
    const onSaved = vi.fn();
    const model = mountModel({ onSaved });

    model.actions.onChange('name', 'RECEPCAO-01');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toBe('Já existe uma máquina com esse nome.'));
    expect(onSaved).not.toHaveBeenCalled();
  });
});
