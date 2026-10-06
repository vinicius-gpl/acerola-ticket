import { type MaintenanceDashboard } from '@template/shared/schemas/maintenance-dashboard.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-maintenance-dashboard-harness.test.svelte';
import { type MaintenanceDashboardModel } from './use-maintenance-dashboard.svelte';

vi.mock('$lib/api/maintenance-dashboard.api', () => ({
  maintenanceDashboardApi: { summary: vi.fn() },
}));

vi.mock('$lib/api/tickets.api', () => ({ ticketsApi: { dashboard: vi.fn() } }));

const { maintenanceDashboardApi } = await import('$lib/api/maintenance-dashboard.api');
const { ticketsApi } = await import('$lib/api/tickets.api');
const { goto } = await import('$app/navigation');

const summary: MaintenanceDashboard = {
  inventory: { products: 14, outOfStock: 2 },
  quotes: { pending: 4, pendingAmountCents: 5643000, approvedAmountCents: 68000 },
  disposals: { units: 2 },
  recentMovements: [],
};

const ticketCounts = {
  total: 9,
  open: 3,
  inProgress: 2,
  waiting: 1,
  resolved: 3,
  cancelled: 0,
  averageResolutionHours: null,
  byProblemType: [],
  byDepartment: [],
};

function mountModel(): MaintenanceDashboardModel {
  let model!: MaintenanceDashboardModel;
  render(Harness, { props: { onReady: (ready: MaintenanceDashboardModel) => (model = ready) } });

  return model;
}

beforeEach(() => {
  vi.mocked(maintenanceDashboardApi.summary).mockReset().mockResolvedValue(summary);
  vi.mocked(ticketsApi.dashboard).mockReset().mockResolvedValue(ticketCounts);
  vi.mocked(goto).mockClear();
});

describe('useMaintenanceDashboardModel', () => {
  // feliz
  it('brings the summary of what belongs to Maintenance', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.summary).not.toBeNull());
    expect(model.data.summary?.inventory.outOfStock).toBe(2);
    expect(model.data.summary?.quotes.pending).toBe(4);
  });

  /* Os chamados são os DA ÁREA: os de Infraestrutura não entram no painel da Manutenção. */
  it('counts only the tickets of the Maintenance area', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.tickets).toEqual({ open: 3, inProgress: 2, waiting: 1 }));
    expect(ticketsApi.dashboard).toHaveBeenCalledWith('manutencao');
  });

  it('takes each card to the screen that explains its number', () => {
    const model = mountModel();

    model.actions.onOpenTickets();
    model.actions.onOpenStock();
    model.actions.onOpenQuotes();
    model.actions.onOpenDisposal();

    expect(vi.mocked(goto).mock.calls.map((call) => call[0])).toEqual([
      '/maintenance/tickets',
      '/maintenance/stock',
      '/maintenance/quotes',
      '/maintenance/disposal',
    ]);
  });

  // triste
  it('does not show zeros while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.data.summary).toBeNull();
    expect(model.data.tickets).toBeNull();
  });

  it('shows the reason when the summary fails', async () => {
    vi.mocked(maintenanceDashboardApi.summary).mockRejectedValue(
      new ApiError(500, 'Não consegui falar com o servidor.'),
    );
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('Não consegui falar com o servidor.'));
  });

  /* A falha dos chamados não derruba o painel: o depósito continua lá. */
  it('still shows the summary when the tickets fail', async () => {
    vi.mocked(ticketsApi.dashboard).mockRejectedValue(new ApiError(500, 'Fila fora do ar.'));
    const model = mountModel();

    /* A tela lê `data` e `state` JUNTOS, já no primeiro desenho — e o teste faz igual. O
       svelte-query só avisa a mudança das propriedades que alguém já leu: lendo só `data`
       antes da falha chegar, o fim do carregamento nunca seria avisado. */
    await waitFor(() => {
      expect(model.state.isTicketsLoading).toBe(false);
      expect(model.data.summary).not.toBeNull();
    });
    expect(model.data.tickets).toBeNull();
    expect(model.state.error).toBeNull();
  });

  it('asks for both again when trying once more', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.summary).not.toBeNull());

    model.actions.onRetry();

    await waitFor(() => expect(maintenanceDashboardApi.summary).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(ticketsApi.dashboard).toHaveBeenCalledTimes(2));
  });
});
