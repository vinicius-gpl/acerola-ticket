import { describe, expect, it } from 'vitest';

import { type TicketWithComputer } from '../repository/tickets.repository';
import { toPublicTicket, toTicket, toTicketInsert, toTicketUpdate } from './tickets.mapper';

const CREATED_AT = new Date('2026-03-01T08:00:00.000Z');
const NOW = new Date('2026-03-01T10:00:00.000Z');
const ANA = 'ana@azuos.com.br';

function row(over: Partial<TicketWithComputer> = {}): TicketWithComputer {
  return {
    id: 7,
    status: 'open',
    priority: 'medium',
    requesterName: 'Bia Costa',
    area: 'infra',
    department: 'financeiro',
    computerId: null,
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

describe('toTicket', () => {
  // feliz
  it('formats the protocol from the ticket number', () => {
    expect(toTicket(row(), null).protocol).toBe('CH-0007');
  });

  it('publishes dates as ISO text, so every screen reads the same format', () => {
    const ticket = toTicket(row({ startedAt: NOW }), null);

    expect(ticket.createdAt).toBe('2026-03-01T08:00:00.000Z');
    expect(ticket.startedAt).toBe('2026-03-01T10:00:00.000Z');
  });

  it('carries the signed screenshot link it was given', () => {
    expect(toTicket(row(), 'https://r2.example/signed').screenshotUrl).toBe(
      'https://r2.example/signed',
    );
  });

  // triste
  it('reports no screenshot as null instead of an empty string', () => {
    expect(toTicket(row(), null).screenshotUrl).toBeNull();
  });

  it('never leaks the storage key, which is not a link anyone can open', () => {
    const ticket = toTicket(row({ screenshotKey: 'chamados/abc.png' }), null);

    expect(ticket).not.toHaveProperty('screenshotKey');
  });

  it('carries the participant areas it was given, besides the original area', () => {
    const ticket = toTicket(row({ area: 'infra' }), null, ['manutencao']);

    expect(ticket.area).toBe('infra');
    expect(ticket.participantAreas).toEqual(['manutencao']);
  });

  // triste
  it('defaults to no participant areas when none were given', () => {
    expect(toTicket(row(), null).participantAreas).toEqual([]);
  });
});

describe('toPublicTicket', () => {
  const answered = row({
    status: 'resolved',
    assignee: 'Carlos do TI',
    solution: 'Troquei o rolete.',
    contactPhone: '62999999999',
  });

  // feliz
  it('keeps what the person needs to follow their own request', () => {
    const ticket = toPublicTicket(answered, null);

    expect(ticket.protocol).toBe('CH-0007');
    expect(ticket.status).toBe('resolved');
    expect(ticket.description).toBe('A impressora não puxa papel.');
  });

  // triste
  it('hides the contact phone, the assignee and the solution from a public lookup', () => {
    const ticket = toPublicTicket(answered, null);

    expect(ticket).not.toHaveProperty('contactPhone');
    expect(ticket).not.toHaveProperty('assignee');
    expect(ticket).not.toHaveProperty('solution');
  });
});

describe('toTicketInsert', () => {
  const input = {
    requesterName: '  Bia Costa  ',
    area: 'infra' as const,
    department: 'rh' as const,
    problemType: 'network' as const,
    contactPhone: ' 62 99999-9999 ',
    description: '  A internet caiu.  ',
  };

  // feliz
  it('trims what the person typed', () => {
    const values = toTicketInsert(input, null);

    expect(values.requesterName).toBe('Bia Costa');
    expect(values.description).toBe('A internet caiu.');
  });

  it('carries the area the person chose', () => {
    expect(toTicketInsert(input, null).area).toBe('infra');
  });

  it('keeps the storage key given by whoever stored the file', () => {
    expect(toTicketInsert(input, 'chamados/abc.png').screenshotKey).toBe('chamados/abc.png');
  });

  it('reads the checkbox sent as text by a multipart form', () => {
    expect(toTicketInsert({ ...input, notifyWhatsapp: 'true' }, null).notifyWhatsapp).toBe(true);
  });

  // triste
  it('does not set a status, so the column default decides and every ticket is born open', () => {
    expect(toTicketInsert(input, null)).not.toHaveProperty('status');
  });

  it('does not sign anyone up for notices by default', () => {
    expect(toTicketInsert(input, null).notifyWhatsapp).toBe(false);
  });
});

describe('toTicketUpdate', () => {
  // feliz
  it('always stamps who touched it and when', () => {
    const update = toTicketUpdate({ solution: 'Pronto.' }, ANA, row(), NOW);

    expect(update.updatedBy).toBe(ANA);
    expect(update.updatedAt).toBe(NOW);
  });

  it('stamps the start when the ticket is picked up', () => {
    const update = toTicketUpdate({ status: 'in_progress' }, ANA, row(), NOW);

    expect(update.startedAt).toBe(NOW);
  });

  it('stamps both start and resolution when it is solved straight away', () => {
    const update = toTicketUpdate({ status: 'resolved' }, ANA, row(), NOW);

    expect(update.startedAt).toBe(NOW);
    expect(update.resolvedAt).toBe(NOW);
  });

  it('keeps the original start when the ticket was already being worked on', () => {
    const current = row({ status: 'in_progress', startedAt: CREATED_AT });
    const update = toTicketUpdate({ status: 'resolved' }, ANA, current, NOW);

    expect(update.startedAt).toBeUndefined();
    expect(update.resolvedAt).toBe(NOW);
  });

  it('clears an emptied solution, so the field can actually be wiped', () => {
    expect(toTicketUpdate({ solution: '   ' }, ANA, row(), NOW).solution).toBeNull();
  });

  // triste
  it('does not move the start stamp when the status did not change', () => {
    const current = row({ status: 'in_progress', startedAt: CREATED_AT });
    const update = toTicketUpdate({ status: 'in_progress' }, ANA, current, NOW);

    expect(update.startedAt).toBeUndefined();
  });

  it('clears the resolution date when a ticket goes back to the queue', () => {
    const current = row({ status: 'resolved', startedAt: CREATED_AT, resolvedAt: CREATED_AT });
    const update = toTicketUpdate({ status: 'in_progress' }, ANA, current, NOW);

    expect(update.resolvedAt).toBeNull();
  });

  it('does not count a cancelled ticket as resolved', () => {
    const current = row({ status: 'resolved', startedAt: CREATED_AT, resolvedAt: CREATED_AT });
    const update = toTicketUpdate({ status: 'cancelled' }, ANA, current, NOW);

    expect(update.resolvedAt).toBeNull();
  });

  it('does not stamp a start for a ticket cancelled before anyone touched it', () => {
    const update = toTicketUpdate({ status: 'cancelled' }, ANA, row(), NOW);

    expect(update.startedAt).toBeUndefined();
  });

  it('touches nothing but the stamps when the change is empty', () => {
    expect(toTicketUpdate({}, ANA, row(), NOW)).toEqual({ updatedAt: NOW, updatedBy: ANA });
  });

  it('reclassifies the area when asked to', () => {
    expect(toTicketUpdate({ area: 'manutencao' }, ANA, row(), NOW).area).toBe('manutencao');
  });

  // triste
  it('leaves the area alone when it was not sent', () => {
    expect(toTicketUpdate({ status: 'resolved' }, ANA, row(), NOW)).not.toHaveProperty('area');
  });
});

describe('toTicket com máquina', () => {
  // feliz
  it('carries the machine the ticket was linked to, with the name the screen shows', () => {
    const ticket = toTicket(row({ computerId: 11, computerName: 'Recepção — balcão' }), null);

    expect(ticket.computerId).toBe(11);
    expect(ticket.computerName).toBe('Recepção — balcão');
  });

  // triste
  /* A maioria dos chamados NÃO tem máquina: quem abre descreve o problema, e vincular é
     trabalho de quem atende. Nulo é o estado normal, não a exceção. */
  it('says nothing instead of inventing a machine', () => {
    const ticket = toTicket(row(), null);

    expect(ticket.computerId).toBeNull();
    expect(ticket.computerName).toBeNull();
  });
});

describe('toTicketUpdate com máquina e tipo', () => {
  // feliz
  it('links the machine and corrects the problem type', () => {
    const update = toTicketUpdate(
      { computerId: 11, problemType: 'slow_computer' },
      ANA,
      row(),
      NOW,
    );

    expect(update.computerId).toBe(11);
    expect(update.problemType).toBe('slow_computer');
  });

  /* Nulo DESVINCULA: é assim que se desfaz um vínculo errado, e por isso o mapper precisa
     distinguir "não mandou o campo" de "mandou vazio". */
  it('unlinks the machine when the field comes empty', () => {
    expect(
      toTicketUpdate({ computerId: null }, ANA, row({ computerId: 11 }), NOW).computerId,
    ).toBeNull();
  });

  // triste
  it('leaves the link alone when the field was not sent', () => {
    const update = toTicketUpdate({ status: 'resolved' }, ANA, row({ computerId: 11 }), NOW);

    expect(update).not.toHaveProperty('computerId');
    expect(update).not.toHaveProperty('problemType');
  });
});
