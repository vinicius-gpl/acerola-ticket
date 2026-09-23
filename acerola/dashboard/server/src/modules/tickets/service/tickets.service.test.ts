import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { ticketListQuerySchema } from '@template/shared/schemas/ticket.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { type StorageService } from '../../../lib/storage/storage.service';
import { type TicketsRepository } from '../repository/tickets.repository';
import { TicketsService, type UploadedScreenshot } from './tickets.service';

const ana: RequestUser = { id: '1', email: 'ana@azuos.com.br', name: 'Ana', role: 'user' };

/** Ninguém identificado: é o que o guard bloquearia antes, e o que a policy recusa aqui. */
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

const CREATED_AT = new Date('2026-03-01T08:00:00.000Z');

function ticketRow(overrides: Partial<TicketRow> = {}): TicketRow {
  return {
    id: 7,
    status: 'open',
    priority: 'medium',
    requesterName: 'Bia Costa',
    department: 'financeiro',
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
    ...overrides,
  };
}

const storageStub = {
  upload: vi.fn().mockResolvedValue({ key: 'chamados/abc.png' }),
  createDownloadUrl: vi.fn().mockResolvedValue('https://r2.example/signed'),
};

function makeService(
  repository: Partial<TicketsRepository>,
  storage: Partial<StorageService> = storageStub,
) {
  return new TicketsService(repository as TicketsRepository, storage as StorageService);
}

const query = (overrides: Record<string, unknown> = {}) => ticketListQuerySchema.parse(overrides);

const pngScreenshot: UploadedScreenshot = {
  originalname: 'erro.png',
  mimetype: 'image/png',
  size: 1024,
  buffer: Buffer.from('fake'),
};

describe('TicketsService.list', () => {
  // feliz
  it('returns the page translated into the contract', async () => {
    const service = makeService({
      list: vi.fn().mockResolvedValue({ rows: [ticketRow(), ticketRow({ id: 8 })], total: 12 }),
    });

    const page = await service.list(ana, query({ page: '2', pageSize: '2' }));

    expect(page).toMatchObject({ total: 12, page: 2, pageSize: 2 });
    expect(page.items[0]?.protocol).toBe('CH-0007');
  });

  it('returns an empty page, not an error, when there is nothing', async () => {
    const service = makeService({ list: vi.fn().mockResolvedValue({ rows: [], total: 0 }) });

    await expect(service.list(ana, query())).resolves.toMatchObject({ items: [], total: 0 });
  });

  // triste
  it('refuses an unidentified request without touching the repository', async () => {
    const list = vi.fn();
    const service = makeService({ list });

    await expect(service.list(noRole, query())).rejects.toThrow(ForbiddenException);
    expect(list).not.toHaveBeenCalled();
  });
});

describe('TicketsService.findById', () => {
  // feliz
  it('opens the ticket with a signed screenshot link', async () => {
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ screenshotKey: 'chamados/abc.png' })),
    });

    const ticket = await service.findById(ana, 7);

    expect(ticket.screenshotUrl).toBe('https://r2.example/signed');
  });

  // triste
  it('says the ticket was not found instead of returning nothing', async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(null) });

    await expect(service.findById(ana, 99)).rejects.toThrow(NotFoundException);
  });
});

describe('TicketsService.create', () => {
  // feliz
  it('opens a ticket without any login at all', async () => {
    const insert = vi.fn().mockResolvedValue(ticketRow());
    const service = makeService({ insert });

    const ticket = await service.create({
      requesterName: 'Bia Costa',
      department: 'financeiro',
      problemType: 'printer',
      contactPhone: '62999999999',
      description: 'A impressora não puxa papel.',
    });

    expect(ticket.protocol).toBe('CH-0007');
    expect(insert).toHaveBeenCalledOnce();
  });

  it('stores the screenshot and keeps its key on the ticket', async () => {
    const insert = vi.fn().mockResolvedValue(ticketRow({ screenshotKey: 'chamados/abc.png' }));
    const upload = vi.fn().mockResolvedValue({ key: 'chamados/abc.png' });
    const service = makeService(
      { insert },
      { upload, createDownloadUrl: vi.fn().mockResolvedValue('https://r2.example/signed') },
    );

    await service.create(
      {
        requesterName: 'Bia Costa',
        department: 'financeiro',
        problemType: 'printer',
        contactPhone: '62999999999',
        description: 'A impressora não puxa papel.',
      },
      pngScreenshot,
    );

    expect(upload).toHaveBeenCalledOnce();
    expect(insert.mock.calls[0]?.[0]).toMatchObject({ screenshotKey: 'chamados/abc.png' });
  });

  // triste
  it('refuses a screenshot that is not an image, without opening the ticket', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });

    const attempt = service.create(
      {
        requesterName: 'Bia Costa',
        department: 'financeiro',
        problemType: 'printer',
        contactPhone: '62999999999',
        description: 'A impressora não puxa papel.',
      },
      { ...pngScreenshot, mimetype: 'application/x-msdownload', originalname: 'virus.exe' },
    );

    await expect(attempt).rejects.toThrow(UnprocessableEntityException);
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses a screenshot bigger than the ceiling', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });

    const attempt = service.create(
      {
        requesterName: 'Bia Costa',
        department: 'financeiro',
        problemType: 'printer',
        contactPhone: '62999999999',
        description: 'A impressora não puxa papel.',
      },
      { ...pngScreenshot, size: 9 * 1024 * 1024 },
    );

    await expect(attempt).rejects.toThrow(/8 MB/);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('TicketsService.findByProtocol', () => {
  // feliz
  it('finds the ticket from the protocol as it was printed', async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(ticketRow()) });

    await expect(service.findByProtocol('CH-0007')).resolves.toMatchObject({ protocol: 'CH-0007' });
  });

  it('accepts the protocol typed from memory, with no dash and no zeros', async () => {
    const findById = vi.fn().mockResolvedValue(ticketRow());
    const service = makeService({ findById });

    await service.findByProtocol('7');

    expect(findById).toHaveBeenCalledWith(7);
  });

  // triste
  it('never exposes the phone, the assignee or the solution on a public lookup', async () => {
    const answered = ticketRow({ assignee: 'Carlos do TI', solution: 'Troquei o rolete.' });
    const service = makeService({ findById: vi.fn().mockResolvedValue(answered) });

    const ticket = await service.findByProtocol('CH-0007');

    expect(ticket).not.toHaveProperty('contactPhone');
    expect(ticket).not.toHaveProperty('assignee');
    expect(ticket).not.toHaveProperty('solution');
  });

  it('refuses text with no number without going to the database', async () => {
    const findById = vi.fn();
    const service = makeService({ findById });

    await expect(service.findByProtocol('meu chamado')).rejects.toThrow(NotFoundException);
    expect(findById).not.toHaveBeenCalled();
  });

  it('says not found for a protocol that does not exist', async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(null) });

    await expect(service.findByProtocol('CH-9999')).rejects.toThrow(NotFoundException);
  });
});

describe('TicketsService.update', () => {
  // feliz
  it('records who attended and stamps the start when the ticket is picked up', async () => {
    const update = vi.fn().mockResolvedValue(ticketRow({ status: 'in_progress' }));
    const service = makeService({ findById: vi.fn().mockResolvedValue(ticketRow()), update });

    await service.update(ana, 7, { status: 'in_progress', assignee: 'Ana' });

    expect(update.mock.calls[0]?.[1]).toMatchObject({
      status: 'in_progress',
      assignee: 'Ana',
      updatedBy: ana.email,
    });
    expect(update.mock.calls[0]?.[1].startedAt).toBeInstanceOf(Date);
  });

  it('lets any identified person on the panel attend, since a ticket has no owner here', async () => {
    const update = vi.fn().mockResolvedValue(ticketRow({ status: 'resolved' }));
    const service = makeService({ findById: vi.fn().mockResolvedValue(ticketRow()), update });

    await expect(service.update(ana, 7, { status: 'resolved' })).resolves.toMatchObject({
      status: 'resolved',
    });
  });

  // triste
  it('refuses an unidentified request without touching the repository', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn(), update });

    await expect(service.update(noRole, 7, { status: 'resolved' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('does not write when the ticket does not exist', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), update });

    await expect(service.update(ana, 99, { status: 'resolved' })).rejects.toThrow(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('TicketsService.dashboard', () => {
  // feliz
  it('measures over every ticket, not only the page on screen', async () => {
    const service = makeService({
      listForMetrics: vi.fn().mockResolvedValue([
        {
          status: 'resolved',
          createdAt: CREATED_AT,
          resolvedAt: new Date('2026-03-01T10:00:00.000Z'),
          problemType: 'printer',
          department: 'rh',
        },
        {
          status: 'open',
          createdAt: CREATED_AT,
          resolvedAt: null,
          problemType: 'printer',
          department: 'financeiro',
        },
      ]),
    });

    const dashboard = await service.dashboard(ana);

    expect(dashboard.total).toBe(2);
    expect(dashboard.averageResolutionHours).toBe(2);
    expect(dashboard.byProblemType[0]).toEqual({ key: 'printer', count: 2 });
  });

  // triste
  it('reports an empty board without inventing an average', async () => {
    const service = makeService({ listForMetrics: vi.fn().mockResolvedValue([]) });

    const dashboard = await service.dashboard(ana);

    expect(dashboard.total).toBe(0);
    expect(dashboard.averageResolutionHours).toBeNull();
  });

  it('refuses an unidentified request without touching the repository', async () => {
    const listForMetrics = vi.fn();
    const service = makeService({ listForMetrics });

    await expect(service.dashboard(noRole)).rejects.toThrow(ForbiddenException);
    expect(listForMetrics).not.toHaveBeenCalled();
  });
});
