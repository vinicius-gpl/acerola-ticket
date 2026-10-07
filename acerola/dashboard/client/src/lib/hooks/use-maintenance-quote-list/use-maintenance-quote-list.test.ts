import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-maintenance-quote-list-harness.test.svelte';
import { type MaintenanceQuoteListModel } from './use-maintenance-quote-list.svelte';

vi.mock('$lib/api/maintenance-quotes.api', () => ({
  maintenanceQuotesApi: { list: vi.fn(), remove: vi.fn() },
}));

const { maintenanceQuotesApi } = await import('$lib/api/maintenance-quotes.api');

function quote(over: Partial<MaintenanceQuote> = {}): MaintenanceQuote {
  return {
    id: 1,
    supplier: 'Clima Norte Refrigeração',
    description: 'Limpeza e recarga de gás dos aparelhos de ar-condicionado',
    kind: 'service',
    amountCents: 96000,
    quotedOn: '2026-10-02',
    status: 'pending',
    note: null,
    attachmentUrl: null,
    attachmentName: null,
    createdAt: '2026-10-02T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function page(items: MaintenanceQuote[], total = items.length) {
  return { items, total, page: 1, pageSize: 200 };
}

function mountModel(): MaintenanceQuoteListModel {
  let model!: MaintenanceQuoteListModel;
  render(Harness, { props: { onReady: (ready: MaintenanceQuoteListModel) => (model = ready) } });

  return model;
}

beforeEach(() => {
  vi.mocked(maintenanceQuotesApi.list)
    .mockReset()
    .mockResolvedValue(page([quote(), quote({ id: 2, amountCents: 354000 })]));
  vi.mocked(maintenanceQuotesApi.remove).mockReset().mockResolvedValue(undefined);
});

describe('useMaintenanceQuoteListModel', () => {
  // feliz
  it('lists the quotes and adds up how much they sum', async () => {
    const model = mountModel();

    await waitFor(() => expect(model.data.quotes).toHaveLength(2));
    expect(model.data.total).toBe(2);
    expect(model.data.amountCents).toBe(450000);
  });

  it('asks the API again with every filter together', async () => {
    const model = mountModel();
    await waitFor(() => expect(maintenanceQuotesApi.list).toHaveBeenCalled());

    model.actions.onSearchChange('  clima ');
    model.actions.onStatusChange('pending');
    model.actions.onKindChange('service');

    await waitFor(() =>
      expect(maintenanceQuotesApi.list).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'clima', status: 'pending', kind: 'service' }),
      ),
    );
  });

  it('clears every filter at once', async () => {
    const model = mountModel();
    model.actions.onStatusChange('approved');
    await waitFor(() => expect(model.data.filter.status).toBe('approved'));

    model.actions.onClearFilters();

    await waitFor(() => expect(model.data.filter).toEqual({ search: '', status: '', kind: '' }));
  });

  /* Excluir é irreversível: primeiro a pergunta, só depois a chamada. */
  it('only deletes after the confirmation', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.quotes).toHaveLength(2));

    model.actions.onAskDelete(quote());
    expect(model.data.deleting?.id).toBe(1);
    expect(maintenanceQuotesApi.remove).not.toHaveBeenCalled();

    model.actions.onConfirmDelete();

    await waitFor(() => expect(maintenanceQuotesApi.remove).toHaveBeenCalledWith(1));
    await waitFor(() => expect(model.data.deleting).toBeNull());
  });

  it('forgets the quote when the deletion is cancelled', async () => {
    const model = mountModel();
    await waitFor(() => expect(model.data.quotes).toHaveLength(2));

    model.actions.onAskDelete(quote());
    model.actions.onCancelDelete();

    expect(model.data.deleting).toBeNull();
    expect(maintenanceQuotesApi.remove).not.toHaveBeenCalled();
  });

  // triste
  /* Vazio só é vazio DEPOIS que a consulta terminou. */
  it('does not say there is no quote while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });

  it('separates empty from hidden by a filter', async () => {
    vi.mocked(maintenanceQuotesApi.list).mockResolvedValue(page([]));
    const model = mountModel();

    await waitFor(() => expect(model.state.isEmpty).toBe(true));
    expect(model.state.isFilteredOut).toBe(false);

    model.actions.onStatusChange('rejected');

    await waitFor(() => expect(model.state.isFilteredOut).toBe(true));
    expect(model.state.isEmpty).toBe(false);
  });

  it('says when the list came shorter than what matched', async () => {
    vi.mocked(maintenanceQuotesApi.list).mockResolvedValue(page([quote()], 300));
    const model = mountModel();

    await waitFor(() => expect(model.state.isTruncated).toBe(true));
  });

  it('shows the reason when the list fails', async () => {
    vi.mocked(maintenanceQuotesApi.list).mockRejectedValue(
      new ApiError(500, 'Não consegui falar com o servidor.'),
    );
    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('Não consegui falar com o servidor.'));
  });

  /* A falha da exclusão fica NA TELA, com o motivo, e o orçamento continua esperando. */
  it('keeps the question open when the deletion fails, with the reason', async () => {
    vi.mocked(maintenanceQuotesApi.remove).mockRejectedValue(
      new ApiError(403, 'Seu cargo em Manutenção só permite consultar.'),
    );
    const model = mountModel();
    await waitFor(() => expect(model.data.quotes).toHaveLength(2));

    model.actions.onAskDelete(quote());
    model.actions.onConfirmDelete();

    await waitFor(() =>
      expect(model.state.deleteError).toBe('Seu cargo em Manutenção só permite consultar.'),
    );
    expect(model.data.deleting?.id).toBe(1);
  });

  it('does nothing when the confirmation comes without a quote (edge case)', () => {
    const model = mountModel();

    model.actions.onConfirmDelete();

    expect(maintenanceQuotesApi.remove).not.toHaveBeenCalled();
  });
});
