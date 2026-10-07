import { describe, expect, it } from 'vitest';

import { type TicketServiceOrderRow } from '../../../lib/db/schema/ticket-service-orders.schema';
import { type ServiceOrder } from '../report/ticket-service-order.pdf';
import { type TicketWithComputer } from '../repository/tickets.repository';
import {
  toIssue,
  toPublicServiceOrder,
  toServiceOrderInsert,
} from './ticket-service-orders.mapper';

const ISSUED_AT = new Date('2026-03-02T11:00:00.000Z');
const CODE = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

const row: TicketServiceOrderRow = {
  id: 1,
  ticketId: 7,
  version: 2,
  code: CODE,
  fileHash: 'f'.repeat(64),
  statusAtIssue: 'waiting_third_party',
  historyCount: 3,
  totalMinutes: 55,
  issuedByName: 'Ana Lima',
  issuedBy: 'ana@azuos.com.br',
  issuedAt: ISSUED_AT,
};

const order = {
  ticket: { id: 7, status: 'in_progress' } as TicketWithComputer,
  protocol: 'CH-0007',
  histories: [{ minutesSpent: 20 }, { minutesSpent: null }, { minutesSpent: 35 }],
} as unknown as ServiceOrder;

describe('toIssue', () => {
  // feliz
  it('rebuilds the issue the document was drawn with', () => {
    expect(toIssue(row, 'http://localhost:5005')).toEqual({
      version: 2,
      code: CODE,
      issuedAt: ISSUED_AT,
      issuedByName: 'Ana Lima',
      webOrigin: 'http://localhost:5005',
    });
  });
});

describe('toServiceOrderInsert', () => {
  const draft = { version: 1, code: CODE, issuedAt: ISSUED_AT, issuedByName: 'Ana Lima' };

  // feliz
  it('registers the fingerprint and the picture of the ticket at that moment', () => {
    expect(toServiceOrderInsert(order, draft, 'f'.repeat(64), 'ana@azuos.com.br')).toEqual({
      ticketId: 7,
      version: 1,
      code: CODE,
      fileHash: 'f'.repeat(64),
      statusAtIssue: 'in_progress',
      historyCount: 3,
      totalMinutes: 55,
      issuedByName: 'Ana Lima',
      issuedBy: 'ana@azuos.com.br',
      issuedAt: ISSUED_AT,
    });
  });

  // triste
  /* Nulo NÃO é zero: "0 min" diria que o atendimento não tomou tempo nenhum. */
  it('keeps the time empty when nobody informed any', () => {
    const insert = toServiceOrderInsert({ ...order, histories: [] }, draft, 'f'.repeat(64), 'ana@azuos.com.br');

    expect(insert.totalMinutes).toBeNull();
    expect(insert.historyCount).toBe(0);
  });
});

describe('toPublicServiceOrder', () => {
  // feliz
  it('gives what is needed to check the paper', () => {
    expect(toPublicServiceOrder(row, 2)).toEqual({
      code: CODE,
      protocol: 'CH-0007',
      version: 2,
      issuedAt: ISSUED_AT.toISOString(),
      statusAtIssue: 'waiting_third_party',
      historyCount: 3,
      totalMinutes: 55,
      fileHash: 'f'.repeat(64),
      isLatest: true,
      latestVersion: 2,
    });
  });

  // triste
  it('marks an issue that was replaced by a newer one', () => {
    expect(toPublicServiceOrder(row, 3)).toMatchObject({ isLatest: false, latestVersion: 3 });
  });

  /* A página é pública: quem emitiu fica de fora. */
  it('leaves out who issued it', () => {
    const found = toPublicServiceOrder(row, 2);

    expect(found).not.toHaveProperty('issuedBy');
    expect(found).not.toHaveProperty('issuedByName');
  });
});
