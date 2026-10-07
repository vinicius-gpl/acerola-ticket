import { ticketAreaLabel } from '@template/shared/domain/ticket-catalog.util';
import {
  CLOSING_TICKET_HISTORY_TYPES,
  type ManualTicketHistoryType,
} from '@template/shared/domain/ticket-history.util';
import { describe, expect, it } from 'vitest';

import { type TicketHistoryRow } from '../../../lib/db/schema/ticket-histories.schema';
import { type TicketWithComputer } from '../repository/tickets.repository';
import {
  describeTicketChanges,
  toHistoryInsert,
  toOpeningHistory,
  toPublicTicketHistory,
  toTicketHistory,
  toTicketMove,
  toUpdateHistory,
} from './ticket-histories.mapper';

const CREATED_AT = new Date('2026-03-01T08:00:00.000Z');
const NOW = new Date('2026-03-01T10:00:00.000Z');
const ANA = { name: 'Ana Lima', email: 'ana@azuos.com.br' };

function ticket(over: Partial<TicketWithComputer> = {}): TicketWithComputer {
  return {
    id: 7,
    status: 'open',
    priority: 'medium',
    requesterName: 'Bia Costa',
    area: 'infra',
    department: 'financeiro',
    computerId: null,
    projectId: null,
    githubIssueNumber: null,
    githubIssueUrl: null,
    computerName: null,
    problemType: 'printer',
    anydeskId: null,
    contactPhone: '62999999999',
    notifyWhatsapp: false,
    description: 'A impressora não puxa papel.',
    screenshotKey: null,
    assignee: null,
    solution: null,
    createdAt: CREATED_AT,
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function entry(type: ManualTicketHistoryType, description = 'Troquei o rolete.') {
  return { type, description, isVisibleToRequester: true };
}

function historyRow(over: Partial<TicketHistoryRow> = {}): TicketHistoryRow {
  return {
    id: 31,
    ticketId: 7,
    type: 'note',
    description: 'Liguei para o fornecedor.',
    statusAfter: 'in_progress',
    isVisibleToRequester: true,
    minutesSpent: 20,
    authorName: 'Ana Lima',
    createdBy: ANA.email,
    createdAt: NOW,
    ...over,
  };
}

describe('toTicketHistory', () => {
  // feliz
  it('publishes the date as ISO text and carries the files attached with it', () => {
    const file = { id: 1, historyId: 31 } as never;
    const history = toTicketHistory(historyRow(), [file]);

    expect(history.createdAt).toBe('2026-03-01T10:00:00.000Z');
    expect(history.attachments).toEqual([file]);
  });

  // triste
  it('defaults to no files instead of nothing at all', () => {
    expect(toTicketHistory(historyRow()).attachments).toEqual([]);
  });
});

describe('toPublicTicketHistory', () => {
  // triste
  /* Quem consulta pelo protocolo acompanha o pedido, não o bastidor do TI. */
  it('hides who wrote it, the time spent and the visibility flag', () => {
    const history = toPublicTicketHistory(toTicketHistory(historyRow()));

    expect(history).not.toHaveProperty('createdBy');
    expect(history).not.toHaveProperty('minutesSpent');
    expect(history).not.toHaveProperty('isVisibleToRequester');
    expect(history.authorName).toBe('Ana Lima');
  });
});

describe('toOpeningHistory', () => {
  // feliz
  it('signs the opening with whoever opened the ticket, on the day it was opened', () => {
    const opening = toOpeningHistory(ticket());

    expect(opening).toMatchObject({
      ticketId: 7,
      type: 'opening',
      statusAfter: 'open',
      authorName: 'Bia Costa',
      createdAt: CREATED_AT,
      isVisibleToRequester: true,
    });
  });

  // triste
  /* O formulário é público: não existe identidade a carimbar. */
  it('stamps no identity, because who opens has none', () => {
    expect(toOpeningHistory(ticket()).createdBy).toBeNull();
  });
});

describe('toHistoryInsert', () => {
  // feliz
  it('records the stage the ticket is left in, as a consequence of the type', () => {
    const insert = toHistoryInsert(ticket(), entry('waiting_third_party'), ANA, NOW);

    expect(insert).toMatchObject({
      type: 'waiting_third_party',
      statusAfter: 'waiting_third_party',
      authorName: 'Ana Lima',
      createdBy: ANA.email,
      createdAt: NOW,
    });
  });

  it('trims the text and keeps the time that was informed', () => {
    const insert = toHistoryInsert(
      ticket(),
      { ...entry('note', '  Testei o cabo.  '), minutesSpent: 15 },
      ANA,
      NOW,
    );

    expect(insert.description).toBe('Testei o cabo.');
    expect(insert.minutesSpent).toBe(15);
  });

  // triste
  /* Tempo não informado é NULO, não zero: zero diria "levou nada", que é outra afirmação. */
  it('keeps a time nobody informed as null, not zero', () => {
    expect(toHistoryInsert(ticket(), entry('note'), ANA, NOW).minutesSpent).toBeNull();
  });

  it('keeps the stage for a history that only adds to the timeline', () => {
    const waiting = ticket({ status: 'waiting_requester' });

    expect(toHistoryInsert(waiting, entry('note'), ANA, NOW).statusAfter).toBe('waiting_requester');
  });
});

describe('toTicketMove', () => {
  // feliz
  it('always stamps who touched the ticket and when', () => {
    const move = toTicketMove(ticket({ assignee: 'Carlos' }), entry('note'), ANA, NOW);

    expect(move).toEqual({ updatedAt: NOW, updatedBy: ANA.email });
  });

  it('stamps the start and makes the author the assignee when the ticket is picked up', () => {
    const move = toTicketMove(ticket(), entry('start'), ANA, NOW);

    expect(move).toMatchObject({ status: 'in_progress', startedAt: NOW, assignee: 'Ana Lima' });
  });

  it('stamps both start and resolution when it is solved straight away', () => {
    const move = toTicketMove(ticket(), entry('resolution'), ANA, NOW);

    expect(move).toMatchObject({ status: 'resolved', startedAt: NOW, resolvedAt: NOW });
  });

  /* Com ressalva também é resolver: entra no indicador de resolvidos e no tempo médio. */
  it('counts a closure with caveats as a resolution', () => {
    const working = ticket({ status: 'in_progress', startedAt: CREATED_AT, assignee: 'Carlos' });
    const move = toTicketMove(working, entry('closure_with_caveats'), ANA, NOW);

    expect(move.status).toBe('resolved_with_caveats');
    expect(move.resolvedAt).toBe(NOW);
    expect(move.startedAt).toBeUndefined();
  });

  it('keeps the text of every closing history as what was done', () => {
    for (const type of CLOSING_TICKET_HISTORY_TYPES) {
      const move = toTicketMove(ticket(), entry(type as ManualTicketHistoryType, ' Feito. '), ANA, NOW);

      expect(move.solution, type).toBe('Feito.');
    }
  });

  it('clears the resolution and the old solution when a ticket is reopened', () => {
    const closed = ticket({
      status: 'resolved',
      startedAt: CREATED_AT,
      resolvedAt: CREATED_AT,
      solution: 'Troquei o rolete.',
      assignee: 'Carlos',
    });
    const move = toTicketMove(closed, entry('reopening', 'Voltou a falhar.'), ANA, NOW);

    expect(move).toMatchObject({ status: 'in_progress', resolvedAt: null, solution: null });
  });

  // triste
  it('does not take the ticket from who already has it', () => {
    const move = toTicketMove(ticket({ assignee: 'Carlos' }), entry('start'), ANA, NOW);

    expect(move).not.toHaveProperty('assignee');
  });

  it('keeps the original start when the ticket was already being worked on', () => {
    const working = ticket({ status: 'in_progress', startedAt: CREATED_AT, assignee: 'Carlos' });

    expect(toTicketMove(working, entry('resolution'), ANA, NOW).startedAt).toBeUndefined();
  });

  /* Cancelado encerra, mas não resolve — e cancelar antes de alguém tocar não é começar. */
  it('stamps neither start nor resolution for a ticket cancelled before anyone touched it', () => {
    const move = toTicketMove(ticket(), entry('cancellation'), ANA, NOW);

    expect(move.status).toBe('cancelled');
    expect(move.startedAt).toBeUndefined();
    expect(move.resolvedAt).toBeUndefined();
  });

  it('does not touch the stage nor its stamps for a history that only adds to the timeline', () => {
    const waiting = ticket({ status: 'waiting_requester', assignee: 'Carlos', startedAt: CREATED_AT });
    const move = toTicketMove(waiting, entry('note'), ANA, NOW);

    expect(move).not.toHaveProperty('status');
    expect(move).not.toHaveProperty('startedAt');
    expect(move).not.toHaveProperty('resolvedAt');
    expect(move).not.toHaveProperty('solution');
  });
});

describe('describeTicketChanges', () => {
  // feliz
  it('says what changed, from what to what, in the words of the screen', () => {
    const after = ticket({ priority: 'high', area: 'manutencao', assignee: 'Carlos' });

    expect(describeTicketChanges(ticket(), after)).toBe(
      [
        'Urgência: Média → Alta',
        `Área: ${ticketAreaLabel('infra')} → ${ticketAreaLabel('manutencao')}`,
        'Responsável: nenhum → Carlos',
      ].join('\n'),
    );
  });

  it('names the machine that was linked and the one that was unlinked', () => {
    const linked = ticket({ computerId: 11, projectId: null, githubIssueNumber: null, githubIssueUrl: null, computerName: 'RECEPCAO-01' });

    expect(describeTicketChanges(ticket(), linked)).toBe('Máquina: nenhum → RECEPCAO-01');
    expect(describeTicketChanges(linked, ticket())).toBe('Máquina: RECEPCAO-01 → nenhum');
  });

  // triste
  it('gives nothing when nothing really changed', () => {
    expect(describeTicketChanges(ticket(), ticket({ updatedAt: NOW }))).toBeNull();
  });
});

describe('toUpdateHistory', () => {
  // feliz
  it('keeps the stage and stays out of the public lookup', () => {
    const working = ticket({ status: 'in_progress' });
    const history = toUpdateHistory(working, 'Urgência: Média → Alta', ANA, NOW);

    expect(history).toMatchObject({
      type: 'update',
      statusAfter: 'in_progress',
      isVisibleToRequester: false,
      authorName: 'Ana Lima',
      createdBy: ANA.email,
    });
  });
});
