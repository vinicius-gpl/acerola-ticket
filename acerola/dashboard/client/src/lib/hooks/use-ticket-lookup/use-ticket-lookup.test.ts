import { type PublicTicket } from '@template/shared/schemas/ticket.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-ticket-lookup-harness.test.svelte';
import { type TicketLookupModel } from './use-ticket-lookup.svelte';

vi.mock('$lib/api/tickets.api', () => ({
  ticketsApi: { findByProtocol: vi.fn() },
}));

const { ticketsApi } = await import('$lib/api/tickets.api');

const ticket: PublicTicket = {
  id: 7,
  protocol: 'CH-0007',
  status: 'in_progress',
  priority: 'high',
  requesterName: 'Bia Costa',
  department: 'financeiro',
  problemType: 'printer',
  anydeskId: null,
  description: 'A impressora não puxa papel.',
  screenshotUrl: null,
  createdAt: '2026-09-15T12:10:00.000Z',
};

function mountModel(): TicketLookupModel {
  let model!: TicketLookupModel;
  render(Harness, { props: { onReady: (ready: TicketLookupModel) => (model = ready) } });

  return model;
}

describe('useTicketLookupModel', () => {
  beforeEach(() => {
    vi.mocked(ticketsApi.findByProtocol).mockResolvedValue(ticket);
  });

  // feliz
  it('finds the ticket for the protocol that was typed', async () => {
    const model = mountModel();

    model.actions.onProtocolChange('CH-0007');
    model.actions.onSearch();

    await waitFor(() => expect(model.data.ticket?.protocol).toBe('CH-0007'));
    expect(ticketsApi.findByProtocol).toHaveBeenCalledWith('CH-0007');
  });

  it('accepts a protocol typed from memory, with no dash and no zeros', async () => {
    const model = mountModel();

    model.actions.onProtocolChange('7');
    model.actions.onSearch();

    await waitFor(() => expect(ticketsApi.findByProtocol).toHaveBeenCalledWith('7'));
  });

  // triste
  /* Como consulta automática, cada tecla viraria requisição e o "não encontrado" piscaria
     enquanto a pessoa ainda estava escrevendo o número. */
  it('does not search while the person is still typing', async () => {
    const model = mountModel();

    model.actions.onProtocolChange('CH-000');

    await waitFor(() => expect(model.data.protocol).toBe('CH-000'));
    expect(ticketsApi.findByProtocol).not.toHaveBeenCalled();
  });

  it('refuses to search text with no number at all', () => {
    const model = mountModel();

    model.actions.onProtocolChange('meu chamado');
    model.actions.onSearch();

    expect(ticketsApi.findByProtocol).not.toHaveBeenCalled();
    expect(model.state.isInvalid).toBe(true);
  });

  it('does not complain about an empty field before anyone typed', () => {
    const model = mountModel();

    expect(model.state.isInvalid).toBe(false);
  });

  /* "Não encontrado" é resposta, não falha do site — e por isso não vira mensagem de erro. */
  it('separates a ticket that does not exist from a server that is down', async () => {
    vi.mocked(ticketsApi.findByProtocol).mockRejectedValue(
      new ApiError(404, 'Chamado não encontrado.'),
    );
    const model = mountModel();

    model.actions.onProtocolChange('CH-9999');
    model.actions.onSearch();

    await waitFor(() => expect(model.state.isNotFound).toBe(true));
    expect(model.state.error).toBeNull();
  });

  it('reports a real failure as an error', async () => {
    vi.mocked(ticketsApi.findByProtocol).mockRejectedValue(
      new ApiError(503, 'O banco está ocupado.'),
    );
    const model = mountModel();

    model.actions.onProtocolChange('CH-0007');
    model.actions.onSearch();

    await waitFor(() => expect(model.state.error).toBe('O banco está ocupado.'));
    expect(model.state.isNotFound).toBe(false);
  });

  /* Deixar o chamado antigo na tela faria a pessoa ler a situação do chamado errado. */
  it('clears the previous result as soon as the protocol changes', async () => {
    const model = mountModel();

    model.actions.onProtocolChange('CH-0007');
    model.actions.onSearch();
    await waitFor(() => expect(model.data.ticket).not.toBeNull());

    model.actions.onProtocolChange('CH-0008');

    await waitFor(() => expect(model.data.ticket).toBeNull());
  });
});
