import { createHash } from 'node:crypto';

import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
import { describe, expect, it } from 'vitest';

import { type TicketWithComputer } from '../repository/tickets.repository';
import {
  buildServiceOrderPdf,
  formatMinutes,
  type ServiceOrderIssue,
  totalMinutes,
} from './ticket-service-order.pdf';

const ticket: TicketWithComputer = {
  id: 7,
  status: 'resolved_with_caveats',
  priority: 'high',
  requesterName: 'Bia Costa',
  area: 'infra',
  department: 'financeiro',
  computerId: 11,
  projectId: null,
  githubIssueNumber: null,
  githubIssueUrl: null,
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

const issue: ServiceOrderIssue = {
  version: 1,
  code: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90',
  issuedAt: new Date('2026-03-02T11:00:00.000Z'),
  issuedByName: 'Ana Lima',
  webOrigin: 'http://localhost:5005',
};

const fingerprint = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');

describe('buildServiceOrderPdf', () => {
  // feliz
  it('builds a PDF with the ticket and its whole timeline', async () => {
    const buffer = await buildServiceOrderPdf(
      {
        ticket,
        protocol: 'CH-0007',
        histories: [
          history({ type: 'opening', authorName: 'Bia Costa', description: 'Chamado aberto.' }),
          history({ id: 2, minutesSpent: 30, isVisibleToRequester: false }),
          history({ id: 3, type: 'closure_with_caveats', statusAfter: 'resolved_with_caveats' }),
        ],
      },
      issue,
    );

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  /* Um chamado com história demais não pode sumir do arquivo: o texto corre e vira a página. */
  it('keeps going over more than one page when the timeline is long', async () => {
    const long = Array.from({ length: 60 }, (_, index) =>
      history({ id: index + 1, description: 'Passo do atendimento. '.repeat(12) }),
    );

    const short = await buildServiceOrderPdf({ ticket, protocol: 'CH-0007', histories: [] }, issue);
    const buffer = await buildServiceOrderPdf({ ticket, protocol: 'CH-0007', histories: long }, issue);

    expect(buffer.length).toBeGreaterThan(short.length);
  });

  /* É o que deixa o sistema conferir um arquivo sem ter guardado o arquivo: a mesma ordem com
     a mesma emissão dá o mesmo PDF, byte a byte — mesmo desenhado em outro momento. */
  it('draws the very same file again for the same order and the same issue', async () => {
    const order = { ticket, protocol: 'CH-0007', histories: [history({ minutesSpent: 30 })] };

    const first = await buildServiceOrderPdf(order, issue);
    const second = await buildServiceOrderPdf(order, { ...issue, issuedAt: new Date(issue.issuedAt) });

    expect(fingerprint(second)).toBe(fingerprint(first));
  });

  /* O link de conferência vai dentro do arquivo, com o código INTEIRO da emissão. */
  it('carries the link to the page that checks it', async () => {
    const buffer = await buildServiceOrderPdf({ ticket, protocol: 'CH-0007', histories: [] }, issue);

    expect(buffer.toString('latin1')).toContain(`http://localhost:5005/verify/${issue.code}`);
  });

  // triste
  it('still builds the document for a ticket with no history and no solution', async () => {
    const buffer = await buildServiceOrderPdf(
      {
        ticket: { ...ticket, solution: null, projectId: null, githubIssueNumber: null, githubIssueUrl: null, computerName: null, assignee: null },
        protocol: 'CH-0007',
        histories: [],
      },
      issue,
    );

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  /* Qualquer diferença no chamado tem de dar OUTRO arquivo — senão a conferência não confere. */
  it('draws a different file when anything in the ticket changed', async () => {
    const order = { ticket, protocol: 'CH-0007', histories: [history()] };

    const before = await buildServiceOrderPdf(order, issue);
    const after = await buildServiceOrderPdf(
      { ...order, histories: [history({ description: 'Liguei para o fornecedor!' })] },
      issue,
    );

    expect(fingerprint(after)).not.toBe(fingerprint(before));
  });
});
