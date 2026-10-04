import { type PublicTicket } from '@template/shared/schemas/ticket.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TicketLookupDrawer from './acerola-ticket-lookup-drawer.svelte';

const ticket: PublicTicket = {
  id: 7,
  protocol: 'CH-0007',
  status: 'in_progress',
  priority: 'high',
  requesterName: 'Bia Costa',
  area: 'infra',
  department: 'financeiro',
  problemType: 'printer',
  anydeskId: null,
  description: 'A impressora não puxa papel.',
  screenshotUrl: null,
  attachments: [],
  createdAt: '2026-09-15T12:10:00.000Z',
};

const actions = { onProtocolChange: vi.fn(), onSearch: vi.fn(), onClose: vi.fn() };

function setup(props: Record<string, unknown> = {}) {
  return render(TicketLookupDrawer, {
    props: {
      data: { protocol: '', ticket: null },
      state: { isOpen: true },
      actions,
      ...props,
    },
  });
}

describe('AcerolaTicketLookupDrawer', () => {
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
      data: {
        protocol: 'CH-0007',
        ticket: { ...ticket, screenshotUrl: 'https://x.invalid/a.png' },
      },
    });

    expect(screen.getByRole('link', { name: /abrir o print/i })).toHaveAttribute(
      'href',
      'https://x.invalid/a.png',
    );
  });

  it('shows the AnyDesk number when the ticket has one', () => {
    setup({ data: { protocol: 'CH-0007', ticket: { ...ticket, anydeskId: '111 222 333' } } });

    expect(screen.getByText('111 222 333')).toBeInTheDocument();
  });

  // triste
  it('stays closed until asked to open', () => {
    setup({ state: { isOpen: false } });

    expect(screen.queryByText(/consultar chamado/i)).not.toBeInTheDocument();
  });

  /* "Não encontrado" é resposta, não falha do site: vir em vermelho faria a pessoa achar
     que o sistema quebrou quando ela só digitou um número errado. */
  it('says nothing was found without dressing it up as a failure', () => {
    setup({
      data: { protocol: 'CH-9999', ticket: null },
      state: { isOpen: true, isNotFound: true },
    });

    expect(screen.getByText(/não encontrei nenhum chamado/i)).toBeInTheDocument();
  });

  it('explains why the button is off when the protocol cannot be read', () => {
    setup({ data: { protocol: 'abc', ticket: null }, state: { isOpen: true, isInvalid: true } });

    expect(screen.getByText(/digite o número do protocolo/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /consultar/i })).toBeDisabled();
  });

  it('shows a server failure as an error, unlike a ticket that does not exist', () => {
    setup({
      data: { protocol: 'CH-0007', ticket: null },
      state: { isOpen: true, error: 'Não consegui falar com o servidor.' },
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
