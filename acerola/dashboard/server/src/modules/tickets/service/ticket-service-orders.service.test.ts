import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  type TicketServiceOrderInsert,
  type TicketServiceOrderRow,
} from '../../../lib/db/schema/ticket-service-orders.schema';
import { type TicketServiceOrdersRepository } from '../repository/ticket-service-orders.repository';
import {
  type TicketsRepository,
  type TicketWithComputer,
} from '../repository/tickets.repository';
import { TicketAccessService } from './ticket-access.service';
import { type TicketHistoriesService } from './ticket-histories.service';
import { fingerprintOf, TicketServiceOrdersService } from './ticket-service-orders.service';

const ana: RequestUser = { id: '1', email: 'ana@azuos.com.br', name: 'Ana Lima', role: 'user' };

const CREATED_AT = new Date('2026-03-01T08:00:00.000Z');
const CODE = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

function ticketRow(overrides: Partial<TicketWithComputer> = {}): TicketWithComputer {
  return {
    id: 7,
    status: 'in_progress',
    priority: 'medium',
    requesterName: 'Bia Costa',
    area: 'manutencao',
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
    assignee: 'Ana Lima',
    solution: null,
    createdAt: CREATED_AT,
    startedAt: CREATED_AT,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function history(over: Partial<TicketHistory> = {}): TicketHistory {
  return {
    id: 1,
    ticketId: 7,
    type: 'note',
    description: 'Liguei para o fornecedor.',
    statusAfter: 'in_progress',
    isVisibleToRequester: true,
    minutesSpent: 20,
    authorName: 'Ana Lima',
    createdBy: ana.email,
    createdAt: CREATED_AT.toISOString(),
    attachments: [],
    ...over,
  };
}

function issuedRow(over: Partial<TicketServiceOrderRow> = {}): TicketServiceOrderRow {
  return {
    id: 1,
    ticketId: 7,
    version: 1,
    code: CODE,
    fileHash: 'f'.repeat(64),
    statusAtIssue: 'in_progress',
    historyCount: 1,
    totalMinutes: 20,
    issuedByName: 'Ana Lima',
    issuedBy: ana.email,
    issuedAt: new Date('2026-03-02T11:00:00.000Z'),
    ...over,
  };
}

type Setup = {
  ticket?: TicketWithComputer | null;
  /** O cargo de Ana em cada área. O padrão é ter cargo na área do chamado. */
  roles?: Record<string, string>;
  histories?: TicketHistory[];
  /** O que já foi emitido, do mais antigo para o mais novo. */
  issued?: TicketServiceOrderRow[];
};

/** Um repositório de mentira que GUARDA o que foi emitido — para emitir duas vezes seguidas. */
function setup({
  ticket = ticketRow(),
  roles = { manutencao: 'user' },
  histories = [history()],
  issued = [],
}: Setup = {}) {
  const rows = [...issued];

  const repository = {
    latestOf: vi.fn(async () => rows.at(-1) ?? null),
    record: vi.fn(async (insert: TicketServiceOrderInsert) => {
      const row = { id: rows.length + 1, ...insert } as TicketServiceOrderRow;
      rows.push(row);

      return row;
    }),
    findByReference: vi.fn(async (reference: string) =>
      rows.filter((row) => row.code.startsWith(reference)).slice(0, 2),
    ),
  };

  const tickets = {
    findById: vi.fn().mockResolvedValue(ticket),
    listAreasOf: vi.fn().mockResolvedValue([]),
    contextRolesFor: vi.fn().mockResolvedValue(roles),
  } as unknown as TicketsRepository;

  const timeline = { list: vi.fn(async () => histories) };

  const service = new TicketServiceOrdersService(
    repository as unknown as TicketServiceOrdersRepository,
    new TicketAccessService(tickets),
    timeline as unknown as TicketHistoriesService,
    { API_CORS_ORIGIN: 'http://localhost:5005/, http://localhost:6006' },
  );

  return { service, repository, rows, histories };
}

describe('TicketServiceOrdersService.issue', () => {
  // feliz
  it('issues the PDF and registers its fingerprint, without keeping the file', async () => {
    const { service, repository } = setup();

    const report = await service.issue(ana, 7);

    expect(report.fileName).toBe('ordem-de-servico-CH-0007.pdf');
    expect(report.buffer.subarray(0, 4).toString()).toBe('%PDF');
    expect(repository.record).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: 7,
        version: 1,
        fileHash: fingerprintOf(report.buffer),
        statusAtIssue: 'in_progress',
        historyCount: 1,
        totalMinutes: 20,
        issuedByName: 'Ana Lima',
        issuedBy: ana.email,
      }),
    );
  });

  it('gives the issue a long code nobody can guess', async () => {
    const { service, rows } = setup();

    await service.issue(ana, 7);

    expect(rows[0]?.code).toMatch(/^[0-9a-f]{64}$/);
  });

  /* Clicar dez vezes não cria dez versões: nada mudou, é o MESMO documento. */
  it('gives the very same document again when nothing changed in the ticket', async () => {
    const { service, repository } = setup();

    const first = await service.issue(ana, 7);
    const second = await service.issue(ana, 7);

    expect(fingerprintOf(second.buffer)).toBe(fingerprintOf(first.buffer));
    expect(repository.record).toHaveBeenCalledOnce();
  });

  it('issues a new version when the ticket changed since the last one', async () => {
    const { service, rows, histories } = setup();

    const first = await service.issue(ana, 7);
    histories.push(history({ id: 2, description: 'A peça chegou.' }));
    const second = await service.issue(ana, 7);

    expect(rows.map((row) => row.version)).toEqual([1, 2]);
    expect(rows[1]?.code).not.toBe(rows[0]?.code);
    expect(fingerprintOf(second.buffer)).not.toBe(fingerprintOf(first.buffer));
  });

  // triste
  /* Quem é de Sistema não emite documento de um chamado só de Manutenção. */
  it('refuses who has no role in any area of the ticket', async () => {
    const { service, repository } = setup({ roles: { sistema: 'admin' } });

    await expect(service.issue(ana, 7)).rejects.toThrow(ForbiddenException);
    expect(repository.record).not.toHaveBeenCalled();
  });

  it('refuses a ticket that does not exist', async () => {
    const { service, repository } = setup({ ticket: null });

    await expect(service.issue(ana, 7)).rejects.toThrow(NotFoundException);
    expect(repository.record).not.toHaveBeenCalled();
  });
});

describe('TicketServiceOrdersService.verify', () => {
  // feliz
  it('finds the issue by the whole code and by the short one', async () => {
    const { service } = setup({ issued: [issuedRow()] });

    const byCode = await service.verify(CODE);
    const byShort = await service.verify(' A1B2C3D4E5F6 ');

    expect(byCode).toMatchObject({ protocol: 'CH-0007', version: 1, isLatest: true });
    expect(byShort.code).toBe(CODE);
  });

  it('says when a newer version of the document exists', async () => {
    const { service } = setup({
      issued: [issuedRow(), issuedRow({ id: 2, version: 2, code: `b${CODE.slice(1)}` })],
    });

    expect(await service.verify(CODE)).toMatchObject({ isLatest: false, latestVersion: 2 });
  });

  /* A página é pública: nada de quem emitiu, nem do conteúdo do chamado. */
  it('never exposes who issued it', async () => {
    const { service } = setup({ issued: [issuedRow()] });

    const found = await service.verify(CODE);

    expect(found).not.toHaveProperty('issuedBy');
    expect(found).not.toHaveProperty('issuedByName');
  });

  // triste
  it('does not find a code that was never issued', async () => {
    const { service } = setup({ issued: [issuedRow()] });

    await expect(service.verify('0'.repeat(64))).rejects.toThrow(NotFoundException);
  });

  /* Um começo curto demais serviria para ir adivinhando — e nem chega ao banco. */
  it('refuses a reference that cannot be a code, without asking the database', async () => {
    const { service, repository } = setup({ issued: [issuedRow()] });

    await expect(service.verify('a1b2')).rejects.toThrow(NotFoundException);
    await expect(service.verify("a1b2c3d4e5f6' or 1=1")).rejects.toThrow(NotFoundException);
    expect(repository.findByReference).not.toHaveBeenCalled();
  });

  it('answers the same for a short code that fits more than one issue', async () => {
    const { service } = setup({
      issued: [issuedRow(), issuedRow({ id: 2, version: 2, code: `${CODE.slice(0, 20)}${'0'.repeat(44)}` })],
    });

    await expect(service.verify(CODE.slice(0, 12))).rejects.toThrow(NotFoundException);
  });
});
