import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import TicketDetailView, {
  totalMinutesOf,
  type AcerolaTicketDetailViewProps,
} from './acerola-ticket-detail-view.svelte';

const ticket: Ticket = {
  id: 29,
  protocol: 'CH-0029',
  status: 'waiting_third_party',
  priority: 'medium',
  requesterName: 'Quitéria Sampaio',
  area: 'infra',
  department: 'pessoal',
  problemType: 'printer',
  participantAreas: [],
  computerId: null,
  computerName: null,
  anydeskId: null,
  contactPhone: '62999990029',
  notifyWhatsapp: true,
  description: 'A impressora do setor não puxa papel.',
  screenshotUrl: null,
  assignee: 'Suporte TI',
  solution: null,
  createdAt: '2026-09-17T11:00:00.000Z',
  startedAt: '2026-09-17T11:30:00.000Z',
  resolvedAt: null,
  updatedAt: null,
  updatedBy: null,
};

function history(over: Partial<TicketHistory> = {}): TicketHistory {
  return {
    id: 1,
    ticketId: 29,
    type: 'note',
    description: 'Liguei para o fornecedor.',
    statusAfter: 'in_progress',
    isVisibleToRequester: true,
    minutesSpent: null,
    authorName: 'Suporte TI',
    createdBy: 'suporte@azuos.local',
    createdAt: '2026-09-17T12:00:00.000Z',
    attachments: [],
    ...over,
  };
}

/* Os formulários têm testes próprios; aqui eles são um marcador, para conferir que a ficha
   reserva o lugar deles. */
const historyForm = createRawSnippet(() => ({ render: () => '<p>formulário de histórico</p>' }));
const dataForm = createRawSnippet(() => ({ render: () => '<p>formulário de dados</p>' }));

function setup(props: Partial<AcerolaTicketDetailViewProps> = {}) {
  const actions = {
    onBack: vi.fn(),
    onDownloadServiceOrder: vi.fn(),
    onRemoveAttachment: vi.fn(),
  };

  render(TicketDetailView, {
    props: {
      data: { ticket, histories: [history()], attachments: [], whatsAppLink: null },
      actions,
      historyForm,
      dataForm,
      ...props,
    },
  });

  return actions;
}

describe('totalMinutesOf', () => {
  // feliz
  it('adds up the time informed along the timeline', () => {
    expect(totalMinutesOf([history({ minutesSpent: 20 }), history(), history({ minutesSpent: 45 })])).toBe(65);
  });

  // triste
  /* Nulo NÃO é zero: "0 min" diria que o atendimento não tomou tempo nenhum. */
  it('gives nothing when nobody informed any time', () => {
    expect(totalMinutesOf([history()])).toBeNull();
    expect(totalMinutesOf([])).toBeNull();
  });
});

describe('AcerolaTicketDetailView', () => {
  // feliz
  it('shows the ticket, its stage and what was asked', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'Chamado CH-0029' })).toBeInTheDocument();
    expect(screen.getByText('Aguardando terceiro')).toBeInTheDocument();
    expect(screen.getByText('A impressora do setor não puxa papel.')).toBeInTheDocument();
    expect(screen.getByText('62999990029')).toBeInTheDocument();
  });

  it('shows the timeline and reserves the place of the two forms', () => {
    setup();

    expect(screen.getByText('Liguei para o fornecedor.')).toBeInTheDocument();
    expect(screen.getByText('formulário de histórico')).toBeInTheDocument();
    expect(screen.getByText('formulário de dados')).toBeInTheDocument();
  });

  it('adds up the time registered along the timeline', () => {
    setup({
      data: {
        ticket,
        histories: [history({ minutesSpent: 40 }), history({ id: 2, minutesSpent: 50 })],
        attachments: [],
        whatsAppLink: null,
      },
    });

    expect(screen.getByText('1 h 30 min')).toBeInTheDocument();
  });

  it('asks for the service order and for the way back', async () => {
    const actions = setup();

    await userEvent.click(screen.getByRole('button', { name: /ordem de serviço/i }));
    await userEvent.click(screen.getByRole('button', { name: /voltar aos chamados/i }));

    expect(actions.onDownloadServiceOrder).toHaveBeenCalledOnce();
    expect(actions.onBack).toHaveBeenCalledOnce();
  });

  it('offers the WhatsApp notice when the person asked to be told', () => {
    setup({
      data: {
        ticket,
        histories: [],
        attachments: [],
        whatsAppLink: 'https://example.invalid/whatsapp',
      },
    });

    expect(screen.getByRole('link', { name: /avisar no whatsapp/i })).toHaveAttribute(
      'href',
      'https://example.invalid/whatsapp',
    );
  });

  /* Num chamado encerrado o bloco do formulário diz o que dá para fazer: reabrir. */
  it('calls the form block a reopening when the ticket is closed', () => {
    setup({
      data: {
        ticket: { ...ticket, status: 'resolved' },
        histories: [],
        attachments: [],
        whatsAppLink: null,
      },
    });

    expect(screen.getByRole('heading', { name: 'Reabrir o chamado' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Novo histórico' })).not.toBeInTheDocument();
  });

  // triste
  /* Ter o telefone no chamado não é autorização para usá-lo. */
  it('offers no WhatsApp notice when the person did not ask for it', () => {
    setup();

    expect(screen.queryByRole('link', { name: /avisar no whatsapp/i })).not.toBeInTheDocument();
  });

  it('shows a dash for what did not happen yet, instead of an invented date', () => {
    setup({
      data: {
        ticket: { ...ticket, status: 'open', startedAt: null, assignee: null },
        histories: [],
        attachments: [],
        whatsAppLink: null,
      },
    });

    /* Iniciado em, resolvido em, máquina, responsável e tempo registrado: nada disso existe. */
    expect(screen.getAllByText('—')).toHaveLength(5);
  });

  /* O arquivo de quem abriu é a prova dela: aparece, mas sem botão de excluir. */
  it('shows the file sent by the requester without a way to delete it', () => {
    setup({
      data: {
        ticket,
        histories: [],
        attachments: [
          {
            id: 4,
            ticketId: 29,
            historyId: null,
            kind: 'pdf',
            origin: 'requester',
            fileName: 'nota-fiscal.pdf',
            contentType: 'application/pdf',
            sizeBytes: 2048,
            viewUrl: 'https://example.invalid/abrir',
            downloadUrl: 'https://example.invalid/baixar',
            createdAt: '2026-09-17T11:00:00.000Z',
            createdBy: null,
          },
        ],
        whatsAppLink: null,
      },
    });

    expect(screen.getByText('nota-fiscal.pdf')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  it('shows why the service order or the timeline could not be read', () => {
    setup({
      data: { ticket, histories: [], attachments: [], whatsAppLink: null },
      state: {
        serviceOrderError: 'Não consegui gerar a ordem de serviço.',
        timelineError: 'Não consegui ler a linha do tempo.',
      },
    });

    expect(screen.getByText('Não consegui gerar a ordem de serviço.')).toBeInTheDocument();
    expect(screen.getByText('Não consegui ler a linha do tempo.')).toBeInTheDocument();
  });
});
