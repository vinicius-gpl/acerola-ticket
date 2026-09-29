import { type Computer } from '@template/shared/schemas/computer.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-computer-detail-harness.test.svelte';
import { type ComputerDetailModel } from './use-computer-detail.svelte';

vi.mock('$lib/api/computers.api', () => ({
  computersApi: {
    findById: vi.fn(),
    samples: vi.fn(),
    alerts: vi.fn(),
    update: vi.fn(),
    regenerateToken: vi.fn(),
  },
}));

/* Os chamados da máquina vêm da feature de Chamados — a ficha só os LÊ, mas a consulta
   acontece, e o teste precisa vê-la para provar que a página vai ao servidor. */
vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { list: vi.fn() },
}));

const { computersApi } = await import('$lib/api/computers.api');
const { ticketsApi } = await import('$lib/api/tickets.api');

const GB = 1024 ** 3;

function computer(over: Partial<Computer> = {}): Computer {
  return {
    id: 3,
    name: 'CONTABIL-03',
    displayName: 'Contábil — mesa do fechamento',
    responsibleName: 'Daniela Prado',
    department: 'contabil',
    hardware: {
      os: 'Microsoft Windows 11 Pro',
      platform: 'windows',
      platformVersion: '10.0.26100',
      kernelVersion: '10.0.26100',
      arch: 'amd64',
      cpuModel: 'AMD Ryzen 5 5600G',
      logicalCpus: 12,
      physicalCpus: 6,
      totalMemoryBytes: 8 * GB,
      macAddress: '00:00:5E:00:53:03',
      localIp: '198.51.100.13',
      totalDiskBytes: 500 * GB,
      freeDiskBytes: 14 * GB,
      uptimeSeconds: 3600,
      bootTime: '2026-09-23T09:00:00.000Z',
    },
    healthScore: 63,
    healthStatus: 'critical',
    warnings: [],
    isOnline: true,
    lastSeenAt: '2026-09-23T11:59:00.000Z',
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

function mountModel(id = 3): ComputerDetailModel {
  let model!: ComputerDetailModel;
  render(Harness, { props: { id, onReady: (ready: ComputerDetailModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<ComputerDetailModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('useComputerDetailModel', () => {
  beforeEach(() => {
    vi.mocked(computersApi.findById).mockResolvedValue(computer());
    vi.mocked(computersApi.samples).mockResolvedValue([]);
    vi.mocked(ticketsApi.list).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 25 });
    vi.mocked(computersApi.alerts).mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 25,
    });
    vi.mocked(computersApi.update).mockResolvedValue(computer({ isArchived: true }));
    vi.mocked(computersApi.regenerateToken).mockResolvedValue({
      computer: computer(),
      token: 'agt_novo',
    });
  });

  // feliz
  it('brings the machine, its usage and the first page of its alerts', async () => {
    const model = await mountLoadedModel();

    expect(model.data.computer?.name).toBe('CONTABIL-03');
    expect(computersApi.samples).toHaveBeenCalledWith(3);
    /* Os alertas vêm PAGINADOS do servidor: uma máquina ruim acumula centenas de episódios. */
    expect(computersApi.alerts).toHaveBeenCalledWith(3, { page: 1, pageSize: 25 });
  });

  /**
   * Trocar de página vai BUSCAR no servidor.
   *
   * É o que este teste tranca: se a paginação voltasse a ser da tela, a consulta seria feita
   * uma vez só e a lista inteira viria para ser cortada aqui — gastando banco, rede e memória
   * do navegador para jogar fora quase tudo.
   */
  it('goes to the server for the next page of alerts', async () => {
    const model = await mountLoadedModel();

    model.actions.onAlertPageChange(3);

    await waitFor(() =>
      expect(computersApi.alerts).toHaveBeenCalledWith(3, { page: 3, pageSize: 25 }),
    );
    expect(model.data.alertPaging.page).toBe(3);
  });

  it('goes to the server for the next page of tickets', async () => {
    const model = await mountLoadedModel();

    model.actions.onTicketPageChange(2);

    await waitFor(() =>
      expect(ticketsApi.list).toHaveBeenCalledWith({ computerId: 3, page: 2, pageSize: 25 }),
    );
    expect(model.data.ticketPaging.page).toBe(2);
  });

  it('archives the machine instead of deleting it', async () => {
    const model = await mountLoadedModel();

    model.actions.onArchivedChange(true);

    await waitFor(() => expect(computersApi.update).toHaveBeenCalledWith(3, { isArchived: true }));
  });

  /* Desbloquear limpa o motivo junto: um motivo pendurado numa máquina liberada faria a
     ficha contar uma história que já não é verdade. */
  it('clears the block reason when the machine is released', async () => {
    const model = await mountLoadedModel();

    model.actions.onBlockedChange(false);

    await waitFor(() =>
      expect(computersApi.update).toHaveBeenCalledWith(3, { isBlocked: false, blockReason: '' }),
    );
  });

  it('hands the new token to the screen once, and forgets it when dismissed', async () => {
    const model = await mountLoadedModel();

    model.actions.onRegenerateToken();
    await waitFor(() => expect(model.data.newToken).toBe('agt_novo'));

    model.actions.onDismissToken();
    expect(model.data.newToken).toBeNull();
  });

  // triste
  /* 404 não é falha de sistema: é uma máquina que não existe mais. Oferecer "tentar de
     novo" para isso só ensina a pessoa a clicar duas vezes antes de pedir ajuda. */
  it('separates a machine that is gone from a server that failed', async () => {
    vi.mocked(computersApi.findById).mockRejectedValue(
      new ApiError(404, 'Computador não encontrado.'),
    );

    const model = mountModel();

    await waitFor(() => expect(model.state.isMissing).toBe(true));
    expect(model.state.error).toBeNull();
  });

  it('hands the screen the reason the record did not open', async () => {
    vi.mocked(computersApi.findById).mockRejectedValue(new ApiError(500, 'O servidor tropeçou.'));

    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O servidor tropeçou.'));
    expect(model.state.isMissing).toBe(false);
  });

  /* Falha de AÇÃO é separada da falha de carregar: a ficha continua na tela, e só o aviso
     de gravação aparece. */
  it('keeps the record on screen when an action fails', async () => {
    vi.mocked(computersApi.update).mockRejectedValue(
      new ApiError(403, 'Você não tem permissão para alterar o cadastro.'),
    );

    const model = await mountLoadedModel();
    model.actions.onArchivedChange(true);

    await waitFor(() =>
      expect(model.state.actionError).toBe('Você não tem permissão para alterar o cadastro.'),
    );
    expect(model.data.computer?.name).toBe('CONTABIL-03');
    expect(model.state.error).toBeNull();
  });
});
