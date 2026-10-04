import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
import { describe, expect, it } from 'vitest';

import { type TicketWithComputer } from '../repository/tickets.repository';
import { buildServiceOrderPdf, formatMinutes, totalMinutes } from './ticket-service-order.pdf';

const ticket: TicketWithComputer = {
  id: 7,
  status: 'resolved_with_caveats',
  priority: 'high',
  requesterName: 'Bia Costa',
  area: 'infra',
  department: 'financeiro',
  computerId: 11,
  computerName: 'RECEPCAO-01',
  problemType: 'printer',
  anydeskId: null,
  contactPhone: '62999999999',
  notifyWhatsapp: false,
  description: 'A impressora não puxa papel.',
  screenshotKey: null,
  assignee: 'Ana Lima',
  solution: 'Troquei o rolete; a bandeja 2 segue com defeito.',
  createdAt: new Date('2026-03-01T08:00:00.000Z'),
  startedAt: new Date('2026-03-01T09:00:00.000Z'),
  resolvedAt: new Date('2026-03-02T10:00:00.000Z'),
  updatedAt: null,
  updatedBy: null,
};

function history(over: Partial<TicketHistory> = {}): TicketHistory {
  return {
    id: 1,
    ticketId: 7,
    type: 'note',
    description: 'Liguei para o fornecedor.',
    statusAfter: 'in_progress',
    isVisibleToRequester: true,
    minutesSpent: null,
    authorName: 'Ana Lima',
    createdBy: 'ana@azuos.com.br',
    createdAt: '2026-03-01T09:30:00.000Z',
    attachments: [],
    ...over,
  };
}

describe('totalMinutes', () => {
  // feliz
  it('adds up the time informed along the timeline', () => {
    const histories = [history({ minutesSpent: 20 }), history(), history({ minutesSpent: 45 })];

    expect(totalMinutes(histories)).toBe(65);
  });

  // triste
  /* Nulo NÃO é zero: "0 min" diria que o atendimento não tomou tempo nenhum. */
  it('gives nothing when nobody informed any time', () => {
    expect(totalMinutes([history(), history()])).toBeNull();
    expect(totalMinutes([])).toBeNull();
  });
});

describe('formatMinutes', () => {
  // feliz
  it('writes the time the way a person says it', () => {
    expect(formatMinutes(45)).toBe('45 min');
    expect(formatMinutes(120)).toBe('2 h');
    expect(formatMinutes(90)).toBe('1 h 30 min');
  });

  // triste
  it('shows a dash for a time nobody informed', () => {
    expect(formatMinutes(null)).toBe('—');
  });
});

describe('buildServiceOrderPdf', () => {
  // feliz
  it('builds a PDF with the ticket and its whole timeline', async () => {
    const buffer = await buildServiceOrderPdf({
      ticket,
      protocol: 'CH-0007',
      histories: [
        history({ type: 'opening', authorName: 'Bia Costa', description: 'Chamado aberto.' }),
        history({ id: 2, minutesSpent: 30, isVisibleToRequester: false }),
        history({ id: 3, type: 'closure_with_caveats', statusAfter: 'resolved_with_caveats' }),
      ],
    });

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  /* Um chamado com história demais não pode sumir do arquivo: o texto corre e vira a página. */
  it('keeps going over more than one page when the timeline is long', async () => {
    const long = Array.from({ length: 60 }, (_, index) =>
      history({ id: index + 1, description: 'Passo do atendimento. '.repeat(12) }),
    );

    const short = await buildServiceOrderPdf({ ticket, protocol: 'CH-0007', histories: [] });
    const buffer = await buildServiceOrderPdf({ ticket, protocol: 'CH-0007', histories: long });

    expect(buffer.length).toBeGreaterThan(short.length);
  });

  // triste
  it('still builds the document for a ticket with no history and no solution', async () => {
    const buffer = await buildServiceOrderPdf({
      ticket: { ...ticket, solution: null, computerName: null, assignee: null },
      protocol: 'CH-0007',
      histories: [],
    });

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});
