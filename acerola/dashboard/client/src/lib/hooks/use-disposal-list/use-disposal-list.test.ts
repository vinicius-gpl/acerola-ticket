import { type Computer } from '@template/shared/schemas/computer.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-disposal-list-harness.test.svelte';
import { summarizeDisposal, type DisposalListModel } from './use-disposal-list.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$lib/api/computers.api', () => ({
  computersApi: { list: vi.fn(), restore: vi.fn() },
}));

const { computersApi } = await import('$lib/api/computers.api');
const { goto } = await import('$app/navigation');

const GB = 1024 ** 3;

function computer(over: Partial<Computer> = {}): Computer {
  return {
    id: 9,
    name: 'RECEPCAO-09',
    displayName: 'Recepção — micro antigo do balcão',
    responsibleName: 'Bia Costa',
    department: 'recepcao',
    hardware: {
      os: null,
      platform: null,
      platformVersion: null,
      kernelVersion: null,
      arch: null,
      cpuModel: null,
      logicalCpus: null,
      physicalCpus: null,
      totalMemoryBytes: 4 * GB,
      macAddress: null,
      localIp: null,
      totalDiskBytes: null,
      freeDiskBytes: null,
      uptimeSeconds: null,
      bootTime: null,
    },
    healthScore: 88,
    healthStatus: 'attention',
    warnings: [],
    isOnline: false,
    lastSeenAt: null,
    agentVersion: null,
    isArchived: false,
    isBlocked: false,
    blockReason: null,
    disposedAt: '2026-08-09T12:00:00.000Z',
    disposalType: 'defect',
    disposalReason: 'Fonte queimada.',
    createdAt: '2026-05-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function page(items: Computer[], total = items.length) {
  return { items, total, page: 1, pageSize: 200 };
}

function mountModel(): DisposalListModel {
  let model!: DisposalListModel;
  render(Harness, { props: { onReady: (ready: DisposalListModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<DisposalListModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('summarizeDisposal', () => {
  // feliz
  /* "Com defeito" e "lixo" levam a decisões diferentes: a primeira ainda rende peça. */
  it('counts each kind of disposal apart', () => {
    const summary = summarizeDisposal([
      computer(),
      computer({ id: 10, disposalType: 'scrap' }),
      computer({ id: 11, disposalType: 'scrap' }),
    ]);

    expect(summary).toEqual({ total: 3, defect: 1, scrap: 2 });
  });

  // triste
  it('counts nothing discarded as zero, not as missing', () => {
    expect(summarizeDisposal([])).toEqual({ total: 0, defect: 0, scrap: 0 });
  });
});

describe('useDisposalListModel', () => {
  beforeEach(() => {
    vi.mocked(computersApi.list).mockResolvedValue(page([computer()]));
    vi.mocked(computersApi.restore).mockResolvedValue(computer({ disposedAt: null }));
    vi.mocked(goto).mockClear();
  });

  // feliz
  /* Esta tela é a das descartadas: sem o recorte, ela mostraria o parque inteiro. */
  it('asks only for the machines that left', async () => {
    await mountLoadedModel();

    expect(computersApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ onlyDisposed: true }),
    );
  });

  it('asks again when the kind of disposal is filtered', async () => {
    const model = await mountLoadedModel();

    model.actions.onTypeChange('scrap');

    await waitFor(() =>
      expect(computersApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ disposalType: 'scrap' }),
      ),
    );
  });

  it('opens the record of a machine that left', async () => {
    const model = await mountLoadedModel();

    model.actions.onOpenMachine(computer({ id: 42 }));

    expect(goto).toHaveBeenCalledWith('/computers/42');
  });

  /* Devolver ao inventário é desfazer uma decisão: pergunta antes. */
  it('does not put a machine back until the question is answered', async () => {
    const model = await mountLoadedModel();

    model.actions.onAskRestore(computer());
    expect(computersApi.restore).not.toHaveBeenCalled();

    model.actions.onConfirmRestore();

    await waitFor(() => expect(computersApi.restore).toHaveBeenCalledWith(9));
  });

  // triste
  it('hands the screen the reason the list did not load', async () => {
    vi.mocked(computersApi.list).mockRejectedValue(new ApiError(500, 'O servidor tropeçou.'));

    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O servidor tropeçou.'));
  });

  it('keeps the list on screen when the restore is refused', async () => {
    vi.mocked(computersApi.restore).mockRejectedValue(
      new ApiError(403, 'Seu perfil não permite alterar o cadastro.'),
    );

    const model = await mountLoadedModel();
    model.actions.onAskRestore(computer());
    model.actions.onConfirmRestore();

    await waitFor(() =>
      expect(model.state.actionError).toBe('Seu perfil não permite alterar o cadastro.'),
    );
    expect(model.data.computers).toHaveLength(1);
    expect(model.state.error).toBeNull();
  });

  it('does not call the list empty while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });
});
