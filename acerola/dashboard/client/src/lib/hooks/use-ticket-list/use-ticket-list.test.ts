import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-ticket-list-harness.test.svelte';
import { type TicketListModel } from './use-ticket-list.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { list: vi.fn(), dashboard: vi.fn(), update: vi.fn() },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');

function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    protocol: 'CH-0001',
    status: 'open',
    priority: 'high',
    requesterName: 'Bia Costa',
    department: 'financeiro',
    problemType: 'printer',
    anydeskId: null,
    contactPhone: '62999990001',
    notifyWhatsapp: false,
    description: 'A impressora não puxa papel.',
    screenshotUrl: null,
    assignee: null,
    solution: null,
    createdAt: '2026-09-15T12:10:00.000Z',
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function page(items: Ticket[], total = items.length) {
  return { items, total, page: 1, pageSize: 200 };
}

const emptyDashboard = {
  total: 0,
  open: 0,
  inProgress: 0,
  resolved: 0,
  cancelled: 0,
  averageResolutionHours: null,
  byProblemType: [],
  byDepartment: [],
};

/** Monta o model. O objeto devolvido tem getters, então continua vivo enquanto o teste roda. */
function mountModel(): TicketListModel {
  let model!: TicketListModel;
  render(Harness, { props: { onReady: (ready: TicketListModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<TicketListModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('useTicketListModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.list).mockResolvedValue(page([ticket()]));
    vi.mocked(ticketsApi.dashboard).mockResolvedValue(emptyDashboard);
  });

  // feliz
  it('brings the queue translated into the contract', async () => {
    const model = await mountLoadedModel();

    expect(model.data.tickets).toHaveLength(1);
    expect(model.data.tickets[0]?.protocol).toBe('CH-0001');
  });

  it('sends every filter together to the API', async () => {
    const model = await mountLoadedModel();

    model.actions.onStatusChange('open');
    model.actions.onDepartmentChange('rh');

    await waitFor(() => {
      expect(ticketsApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'open', department: 'rh' }),
      );
    });
  });

  it('clears every filter at once', async () => {
    const model = await mountLoadedModel();

    model.actions.onStatusChange('resolved');
    model.actions.onSearchChange('impressora');
    await waitFor(() => expect(model.data.filter.status).toBe('resolved'));

    model.actions.onClearFilters();

    await waitFor(() => {
      expect(model.data.filter.status).toBe('');
      expect(model.data.filter.search).toBe('');
    });
  });

  // triste
  /* "Ainda não há chamado" e "o filtro escondeu tudo" pedem ações opostas de quem lê. */
  it('separates an empty queue from a queue hidden by the filter', async () => {
    vi.mocked(ticketsApi.list).mockResolvedValue(page([]));
    const model = await mountLoadedModel();

    expect(model.state.isEmpty).toBe(true);
    expect(model.state.isFilteredOut).toBe(false);

    model.actions.onStatusChange('resolved');

    await waitFor(() => {
      expect(model.state.isFilteredOut).toBe(true);
      expect(model.state.isEmpty).toBe(false);
    });
  });

  it('does not call the queue empty while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });

  it('reports the failure with the reason the server gave', async () => {
    vi.mocked(ticketsApi.list).mockRejectedValue(new ApiError(500, 'O banco está ocupado.'));
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O banco está ocupado.'));
  });

  /* Truncar calado é mentir sobre o tamanho da fila. */
  it('says the page does not hold everything that matched', async () => {
    vi.mocked(ticketsApi.list).mockResolvedValue(page([ticket()], 240));
    const model = await mountLoadedModel();

    expect(model.state.isTruncated).toBe(true);
    expect(model.data.total).toBe(240);
  });

  /* "Quanto tempo levamos para resolver" é uma pergunta sobre o atendimento inteiro. */
  it('does not refetch the indicators when a list filter changes', async () => {
    const model = await mountLoadedModel();
    await waitFor(() => expect(ticketsApi.dashboard).toHaveBeenCalledOnce());

    model.actions.onStatusChange('resolved');
    await waitFor(() => expect(model.data.filter.status).toBe('resolved'));

    expect(ticketsApi.dashboard).toHaveBeenCalledOnce();
  });
});
