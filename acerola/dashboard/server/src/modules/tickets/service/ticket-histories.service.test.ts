import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { type ManualTicketHistoryType } from '@template/shared/domain/ticket-history.util';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type TicketHistoryRow } from '../../../lib/db/schema/ticket-histories.schema';
import { type TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import {
  type TicketsRepository,
  type TicketWithComputer,
} from '../repository/tickets.repository';
import { TicketAccessService } from './ticket-access.service';
import { type TicketAttachmentsService } from './ticket-attachments.service';
import { TicketHistoriesService } from './ticket-histories.service';

const ana: RequestUser = { id: '1', email: 'ana@azuos.com.br', name: 'Ana Lima', role: 'user' };
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

const CREATED_AT = new Date('2026-03-01T08:00:00.000Z');

function ticketRow(overrides: Partial<TicketWithComputer> = {}): TicketWithComputer {
  return {
    id: 7,
    status: 'in_progress',
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

function historyRow(overrides: Partial<TicketHistoryRow> = {}): TicketHistoryRow {
  return {
    id: 31,
    ticketId: 7,
    type: 'note',
    description: 'Liguei para o fornecedor.',
    statusAfter: 'in_progress',
    isVisibleToRequester: true,
    minutesSpent: null,
    authorName: 'Ana Lima',
    createdBy: ana.email,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

const entry = (type: ManualTicketHistoryType, description = 'Troquei o rolete.') => ({
  type,
  description,
  isVisibleToRequester: true,
});

type Setup = {
  ticket?: TicketWithComputer | null;
  /** O cargo de Ana em cada área. O padrão é ADMINISTRAR Infra: pode tudo no chamado. */
  roles?: Record<string, string>;
  record?: ReturnType<typeof vi.fn>;
  listByTicket?: ReturnType<typeof vi.fn>;
  attachments?: Partial<TicketAttachmentsService>;
};

function setup({
  ticket = ticketRow(),
  roles = { infra: 'admin' },
  record = vi.fn().mockImplementation(async (history) => historyRow(history)),
  listByTicket = vi.fn().mockResolvedValue([]),
  attachments = {},
}: Setup = {}) {
  const tickets = {
    findById: vi.fn().mockResolvedValue(ticket),
    listAreasOf: vi.fn().mockResolvedValue([]),
    contextRolesFor: vi.fn().mockResolvedValue(roles),
  } as unknown as TicketsRepository;

  const attachmentsStub = {
    assertAcceptable: vi.fn(),
    attach: vi.fn().mockResolvedValue([]),
    list: vi.fn().mockResolvedValue([]),
    ...attachments,
  };

  const service = new TicketHistoriesService(
    { record, listByTicket } as unknown as TicketHistoriesRepository,
    new TicketAccessService(tickets),
    attachmentsStub as unknown as TicketAttachmentsService,
  );

  return { service, record, listByTicket, attachments: attachmentsStub };
}

describe('TicketHistoriesService.create', () => {
  // feliz
  it('records the history and moves the ticket in the same step', async () => {
    const { service, record } = setup();

    const history = await service.create(ana, 7, entry('waiting_third_party', 'Pedi a fonte.'));

    expect(history.statusAfter).toBe('waiting_third_party');
    expect(record.mock.calls[0]?.[0]).toMatchObject({
      ticketId: 7,
      type: 'waiting_third_party',
      authorName: 'Ana Lima',
      createdBy: ana.email,
    });
    expect(record.mock.calls[0]?.[1]).toMatchObject({
      status: 'waiting_third_party',
      updatedBy: ana.email,
    });
  });

  it('closes the ticket with a closing history, keeping what was done', async () => {
    const { service, record } = setup();

    await service.create(ana, 7, entry('resolution'));

    expect(record.mock.calls[0]?.[1]).toMatchObject({
      status: 'resolved',
      solution: 'Troquei o rolete.',
    });
    expect(record.mock.calls[0]?.[1].resolvedAt).toBeInstanceOf(Date);
  });

  it('attaches the files to the history it just recorded, on the support side', async () => {
    const file = { originalname: 'nota.pdf', mimetype: 'application/pdf', size: 10, buffer: Buffer.from('x') };
    const { service, attachments } = setup();

    await service.create(ana, 7, entry('note'), [file]);

    expect(attachments.attach).toHaveBeenCalledWith(7, [file], ana.email, 'support', 31);
  });

  it('lets a "manager" cargo contribute with a history that does not close', async () => {
    const { service } = setup({ roles: { infra: 'manager' } });

    await expect(service.create(ana, 7, entry('waiting_requester'))).resolves.toMatchObject({
      statusAfter: 'waiting_requester',
    });
  });

  it('lets an admin reopen a closed ticket', async () => {
    const { service, record } = setup({ ticket: ticketRow({ status: 'resolved' }) });

    await service.create(ana, 7, entry('reopening', 'Voltou a falhar.'));

    expect(record.mock.calls[0]?.[1]).toMatchObject({ status: 'in_progress', solution: null });
  });

  // triste
  it('refuses an unidentified request without touching the repository', async () => {
    const { service, record } = setup();

    await expect(service.create(noRole, 7, entry('note'))).rejects.toThrow(ForbiddenException);
    expect(record).not.toHaveBeenCalled();
  });

  it('does not write when the ticket does not exist', async () => {
    const { service, record } = setup({ ticket: null });

    await expect(service.create(ana, 99, entry('note'))).rejects.toThrow(NotFoundException);
    expect(record).not.toHaveBeenCalled();
  });

  it('refuses a "user" cargo to record anything at all', async () => {
    const { service, record } = setup({ roles: { infra: 'user' } });

    await expect(service.create(ana, 7, entry('note'))).rejects.toThrow(ForbiddenException);
    expect(record).not.toHaveBeenCalled();
  });

  it('refuses someone with no cargo in any area of the ticket', async () => {
    const { service, record } = setup({ roles: { manutencao: 'admin' } });

    await expect(service.create(ana, 7, entry('note'))).rejects.toThrow(ForbiddenException);
    expect(record).not.toHaveBeenCalled();
  });

  /* Gestor contribui, mas NUNCA encerra — tirar um chamado da fila é exclusivo de quem
     administra a área (#13). Vale para TODO tipo que encerra, inclusive os que vierem. */
  it.each(['resolution', 'closure_with_caveats', 'cancellation'] as const)(
    'refuses a "manager" cargo to close a ticket with %s',
    async (type) => {
      const { service, record } = setup({ roles: { infra: 'manager' } });

      await expect(service.create(ana, 7, entry(type))).rejects.toThrow(ForbiddenException);
      expect(record).not.toHaveBeenCalled();
    },
  );

  /* Reabrir desfaz um encerramento: pede o mesmo cargo de quem encerra. */
  it('refuses a "manager" cargo to reopen a closed ticket', async () => {
    const { service, record } = setup({
      ticket: ticketRow({ status: 'resolved' }),
      roles: { infra: 'manager' },
    });

    await expect(service.create(ana, 7, entry('reopening'))).rejects.toThrow(ForbiddenException);
    expect(record).not.toHaveBeenCalled();
  });

  it('refuses a history that does not fit the stage, with the reason from the domain', async () => {
    const { service, record } = setup({ ticket: ticketRow({ status: 'resolved' }) });

    await expect(service.create(ana, 7, entry('note'))).rejects.toThrow(
      UnprocessableEntityException,
    );
    await expect(service.create(ana, 7, entry('note'))).rejects.toThrow(/Reabra-o/);
    expect(record).not.toHaveBeenCalled();
  });

  /* Recusar o arquivo DEPOIS de gravar deixaria na linha do tempo um "segue a nota em anexo"
     sem anexo nenhum. */
  it('records nothing when a file is out of the rules', async () => {
    const { service, record } = setup({
      attachments: {
        assertAcceptable: vi.fn().mockImplementation(() => {
          throw new BadRequestException('Arquivo grande demais.');
        }),
      },
    });

    await expect(service.create(ana, 7, entry('note'))).rejects.toThrow(BadRequestException);
    expect(record).not.toHaveBeenCalled();
  });
});

describe('TicketHistoriesService.list', () => {
  // feliz
  it('gives the timeline with each history carrying its own files', async () => {
    const { service } = setup({
      listByTicket: vi.fn().mockResolvedValue([historyRow({ id: 31 }), historyRow({ id: 32 })]),
      attachments: {
        list: vi.fn().mockResolvedValue([
          { id: 1, historyId: 32 },
          { id: 2, historyId: null },
        ]),
      },
    });

    const timeline = await service.list(ana, 7);

    expect(timeline.map((history) => history.attachments.length)).toEqual([0, 1]);
  });

  // triste
  it('refuses to show the timeline of a ticket from an area the person has no cargo in', async () => {
    const { service, listByTicket } = setup({ roles: { sistema: 'admin' } });

    await expect(service.list(ana, 7)).rejects.toThrow(ForbiddenException);
    expect(listByTicket).not.toHaveBeenCalled();
  });

  it('refuses an unidentified request', async () => {
    const { service } = setup();

    await expect(service.list(noRole, 7)).rejects.toThrow(ForbiddenException);
  });
});

describe('TicketHistoriesService.listPublic', () => {
  // feliz
  it('asks the database only for what the requester may see', async () => {
    const { service, listByTicket } = setup({
      listByTicket: vi.fn().mockResolvedValue([historyRow()]),
    });

    const timeline = await service.listPublic(7, []);

    expect(listByTicket).toHaveBeenCalledWith(7, { visibleToRequesterOnly: true });
    expect(timeline).toHaveLength(1);
  });

  // triste
  it('never exposes who wrote it nor the time spent', async () => {
    const { service } = setup({
      listByTicket: vi.fn().mockResolvedValue([historyRow({ minutesSpent: 40 })]),
    });

    const [history] = await service.listPublic(7, []);

    expect(history).not.toHaveProperty('createdBy');
    expect(history).not.toHaveProperty('minutesSpent');
  });
});
