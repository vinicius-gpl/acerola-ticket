import { type PublicTicket } from '@template/shared/schemas/ticket.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TicketLookupCard from './ticket-lookup-card.svelte';

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

const actions = { onProtocolChange: vi.fn(), onSearch: vi.fn() };

function setup(props: Partial<Parameters<typeof render>[1]> = {}) {
  return render(TicketLookupCard, {
    props: {
      data: { protocol: '', ticket: null },
      state: {},
      actions,
      ...(props as object),
    },
  });
}

describe('TicketLookupCard', () => {
  // feliz
  it('shows the ticket it was given, in words the requester understands', () => {
    setup({ data: { protocol: 'CH-0007', ticket } });

    expect(screen.getByText('CH-0007')).toBeInTheDocument();
    expect(screen.getByText('Em atendimento')).toBeInTheDocument();
    expect(screen.getByText('FINANCEIRO')).toBeInTheDocument();
    expect(screen.getByText('Impressora')).toBeInTheDocument();
  });

  it('asks for the search when the button is pressed', async () => {
    const onSearch = vi.fn();
    setup({ data: { protocol: 'CH-0007', ticket: null }, actions: { ...actions, onSearch } });

    await userEvent.click(screen.getByRole('button', { name: /consultar/i }));

    expect(onSearch).toHaveBeenCalledOnce();
  });

  it('offers the screenshot when the ticket has one', () => {
    setup({
      data: { protocol: 'CH-0007', ticket: { ...ticket, screenshotUrl: 'https://x.invalid/a.png' } },
    });

    expect(screen.getByRole('link', { name: /abrir o print/i })).toHaveAttribute(
      'href',
      'https://x.invalid/a.png',
    );
  });

  // triste
  /* "Não encontrado" é resposta, não falha do site: vir em vermelho faria a pessoa achar
     que o sistema quebrou quando ela só digitou um número errado. */
  it('says nothing was found without dressing it up as a failure', () => {
    setup({ data: { protocol: 'CH-9999', ticket: null }, state: { isNotFound: true } });

    expect(screen.getByText(/não encontrei nenhum chamado/i)).toBeInTheDocument();
  });

  it('explains why the button is off when the protocol cannot be read', () => {
    setup({ data: { protocol: 'abc', ticket: null }, state: { isInvalid: true } });

    expect(screen.getByText(/digite o número do protocolo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /consultar/i })).toBeDisabled();
  });

  it('shows a server failure as an error, unlike a ticket that does not exist', () => {
    setup({
      data: { protocol: 'CH-0007', ticket: null },
      state: { error: 'Não consegui falar com o servidor.' },
    });

    expect(screen.getByText(/não consegui falar com o servidor/i)).toBeInTheDocument();
  });

  it('shows no ticket area at all before anyone searched', () => {
    setup();

    expect(screen.queryByText(/aberto por/i)).not.toBeInTheDocument();
  });

  /* O painel vê telefone, responsável e solução; esta tela não os recebe do servidor. */
  it('never shows a phone number, because the public lookup does not receive one', () => {
    setup({ data: { protocol: 'CH-0007', ticket } });

    expect(screen.queryByText(/62999990001/)).not.toBeInTheDocument();
  });
});
