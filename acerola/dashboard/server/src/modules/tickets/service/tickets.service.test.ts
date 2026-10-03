import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ticketListQuerySchema } from '@template/shared/schemas/ticket.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';

import { type StorageService } from '../../../lib/storage/storage.service';
import {
  type TicketsRepository,
  type TicketWithComputer,
} from '../repository/tickets.repository';
import { type TicketAttachmentsService } from './ticket-attachments.service';
import { TicketsService, type UploadedScreenshot } from './tickets.service';

const ana: RequestUser = { id: '1', email: 'ana@azuos.com.br', name: 'Ana', role: 'user' };

/** Ninguém identificado: é o que o guard bloquearia antes, e o que a policy recusa aqui. */
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

const CREATED_AT = new Date('2026-03-01T08:00:00.000Z');

function ticketRow(overrides: Partial<TicketWithComputer> = {}): TicketWithComputer {
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
    ...overrides,
  };
}

const storageStub = {
  upload: vi.fn().mockResolvedValue({ key: 'tickets/abc.png' }),
  createDownloadUrl: vi.fn().mockResolvedValue('https://r2.example/signed'),
};

/* Os anexos têm serviço próprio, com testes próprios: aqui só se confere que o chamado o
   chama. Um duplo que não faz nada é o suficiente — e mantém este teste sobre chamados. */
const attachmentsStub = {
  attach: vi.fn().mockResolvedValue([]),
  list: vi.fn().mockResolvedValue([]),
};

/**
 * O cargo padrão de quem testa: Ana é GESTORA (`manager`) em Infra, e nenhum cargo nos outros
 * dois — é por isso que `ticketRow()` nasce em Infra. `manager`, e não `user`, porque o
 * padrão dos testes que só querem "atender" precisa de alguém que CONSEGUE escrever — `user`
 * só consulta (#13); os testes que exercitam essa fronteira sobrescrevem explicitamente.
 */
const defaultRepository: Partial<TicketsRepository> = {
  contextRolesFor: vi.fn().mockResolvedValue({ infra: 'manager' }),
  listAreasOf: vi.fn().mockResolvedValue([]),
  listAreasFor: vi.fn().mockResolvedValue(new Map()),
};

function makeService(
  repository: Partial<TicketsRepository>,
  storage: Partial<StorageService> = storageStub,
  attachments: Partial<TicketAttachmentsService> = attachmentsStub,
) {
  return new TicketsService(
    { ...defaultRepository, ...repository } as TicketsRepository,
    storage as StorageService,
    attachments as TicketAttachmentsService,
  );
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
      findById: vi.fn().mockResolvedValue(ticketRow({ screenshotKey: 'tickets/abc.png' })),
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
      area: 'infra' as const,
      department: 'financeiro',
      problemType: 'printer',
      contactPhone: '62999999999',
      description: 'A impressora não puxa papel.',
    });

    expect(ticket.protocol).toBe('CH-0007');
    expect(insert).toHaveBeenCalledOnce();
  });

  it('stores the screenshot and keeps its key on the ticket', async () => {
    const insert = vi.fn().mockResolvedValue(ticketRow({ screenshotKey: 'tickets/abc.png' }));
    const upload = vi.fn().mockResolvedValue({ key: 'tickets/abc.png' });
    const service = makeService(
      { insert },
      { upload, createDownloadUrl: vi.fn().mockResolvedValue('https://r2.example/signed') },
    );

    await service.create(
      {
        requesterName: 'Bia Costa',
        area: 'infra' as const,
        department: 'financeiro',
        problemType: 'printer',
        contactPhone: '62999999999',
        description: 'A impressora não puxa papel.',
      },
      pngScreenshot,
    );

    expect(upload).toHaveBeenCalledOnce();
    expect(insert.mock.calls[0]?.[0]).toMatchObject({ screenshotKey: 'tickets/abc.png' });
  });

  // triste
  it('refuses a screenshot that is not an image, without opening the ticket', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });

    const attempt = service.create(
      {
        requesterName: 'Bia Costa',
        area: 'infra' as const,
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
        area: 'infra' as const,
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

  it('lets a manager move a ticket forward, since it has no single owner here', async () => {
    const update = vi.fn().mockResolvedValue(ticketRow({ status: 'in_progress' }));
    const service = makeService({ findById: vi.fn().mockResolvedValue(ticketRow()), update });

    await expect(service.update(ana, 7, { status: 'in_progress' })).resolves.toMatchObject({
      status: 'in_progress',
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

    await expect(service.update(ana, 99, { status: 'resolved' })).rejects.toThrow(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });
});

describe('TicketsService.exportList', () => {
  // feliz
  it('builds the file from every ticket that matched, not only a page', async () => {
    const listAll = vi.fn().mockResolvedValue([ticketRow(), ticketRow({ id: 8 })]);
    const service = makeService({ listAll });

    const report = await service.exportList(ana, { format: 'xlsx', status: 'open' });

    expect(listAll).toHaveBeenCalledWith({ format: 'xlsx', status: 'open' }, ['infra']);
    expect(report.fileName).toBe('chamados.xlsx');
    expect(report.buffer.length).toBeGreaterThan(0);
  });

  // triste
  it('refuses an unidentified request without touching the repository', async () => {
    const listAll = vi.fn();
    const service = makeService({ listAll });

    await expect(service.exportList(noRole, { format: 'xlsx' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(listAll).not.toHaveBeenCalled();
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
          area: 'infra',
        },
        {
          status: 'open',
          createdAt: CREATED_AT,
          resolvedAt: null,
          problemType: 'printer',
          department: 'financeiro',
          area: 'infra',
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

  // feliz
  it('scopes the metrics to the areas the person has a role in', async () => {
    const listForMetrics = vi.fn().mockResolvedValue([]);
    const service = makeService({ listForMetrics });

    await service.dashboard(ana);

    expect(listForMetrics).toHaveBeenCalledWith(['infra']);
  });
});

/**
 * As áreas (#13) são um cargo PRÓPRIO do chamado, sem o mínimo `user` que o cargo interno
 * (#11) tem em outros lugares: sem linha em `internal_roles`, não existe cargo — nunca
 * `'user'` por omissão. Cada teste aqui é uma tentativa de escalação (CONTRIBUTING §7).
 */
describe('TicketsService — acesso por área', () => {
  const manutencao: RequestUser = { ...ana, id: '2', email: 'carlos@azuos.com.br' };
  /* SUPER administrador: 100%, ponta a ponta, sem fronteira — o único papel com bypass. */
  const superadmin: RequestUser = { ...ana, id: '3', email: 'root@azuos.com.br', role: 'superadmin' };
  /* Administrador GLOBAL (não super): "faz tudo no contexto DELE" — não ganha área nenhuma
     de graça, precisa do mesmo cargo interno que gestor e usuário precisam (#13). */
  const globalAdmin: RequestUser = { ...ana, id: '4', email: 'admin@azuos.com.br', role: 'admin' };

  // feliz
  it('scopes the queue to the areas the person has a role in', async () => {
    const list = vi.fn().mockResolvedValue({ rows: [], total: 0 });
    const service = makeService({ list });

    await service.list(ana, query());

    expect(list).toHaveBeenCalledWith(expect.anything(), ['infra']);
  });

  it('lets a superadmin see every area without even reading internal_roles', async () => {
    const list = vi.fn().mockResolvedValue({ rows: [], total: 0 });
    const contextRolesFor = vi.fn();
    const service = makeService({ list, contextRolesFor });

    await service.list(superadmin, query());

    expect(list.mock.calls[0]?.[1]).toEqual(
      expect.arrayContaining(['infra', 'sistema', 'manutencao']),
    );
    expect(contextRolesFor).not.toHaveBeenCalled();
  });

  // triste
  /* "Admin faz tudo no CONTEXTO dele" — sem cargo em área nenhuma, um admin global não vê
     nada, igual a qualquer outro papel. Só super administrador tem o bypass automático. */
  it('gives a plain global admin nothing without area cargo, the same opt-in as everyone', async () => {
    const list = vi.fn().mockResolvedValue({ rows: [], total: 0 });
    const contextRolesFor = vi.fn().mockResolvedValue({});
    const service = makeService({ list, contextRolesFor });

    await service.list(globalAdmin, query());

    expect(contextRolesFor).toHaveBeenCalled();
    expect(list).toHaveBeenCalledWith(expect.anything(), []);
  });

  it('scopes the queue to nothing when the person has no role anywhere', async () => {
    const list = vi.fn().mockResolvedValue({ rows: [], total: 0 });
    const contextRolesFor = vi.fn().mockResolvedValue({});
    const service = makeService({ list, contextRolesFor });

    await service.list(ana, query());

    expect(list).toHaveBeenCalledWith(expect.anything(), []);
  });

  it('refuses to open a ticket from an area the person has no role in', async () => {
    const contextRolesFor = vi.fn().mockResolvedValue({ manutencao: 'user' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      contextRolesFor,
    });

    await expect(service.findById(manutencao, 7)).rejects.toThrow(ForbiddenException);
  });

  it('lets a person in through a PARTICIPANT area, even without the original one', async () => {
    const contextRolesFor = vi.fn().mockResolvedValue({ manutencao: 'user' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      listAreasOf: vi.fn().mockResolvedValue(['manutencao']),
      contextRolesFor,
    });

    await expect(service.findById(manutencao, 7)).resolves.toMatchObject({ id: 7 });
  });

  it('refuses to reclassify the area with only the "user" role, even having a role there', async () => {
    const update = vi.fn();
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'user' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      update,
      contextRolesFor,
    });

    await expect(service.update(ana, 7, { area: 'manutencao' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  // feliz
  it('lets a manager of the ticket area reclassify it', async () => {
    const update = vi.fn().mockResolvedValue(ticketRow({ area: 'manutencao' }));
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'manager' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      update,
      contextRolesFor,
    });

    await expect(service.update(ana, 7, { area: 'manutencao' })).resolves.toMatchObject({
      area: 'manutencao',
    });
  });

  /**
   * Os QUATRO níveis de cargo numa área, sobre o mesmo chamado (#13):
   * `user` só consulta; `manager` contribui mas nunca finaliza; `admin` faz tudo.
   */
  // triste
  it('refuses a "user" cargo to write anything at all, not even a non-terminal change', async () => {
    const update = vi.fn();
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'user' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      update,
      contextRolesFor,
    });

    await expect(service.update(ana, 7, { status: 'in_progress' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  // feliz
  it('lets a "manager" cargo contribute with a non-terminal status change', async () => {
    const update = vi.fn().mockResolvedValue(ticketRow({ status: 'in_progress' }));
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'manager' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      update,
      contextRolesFor,
    });

    await expect(service.update(ana, 7, { status: 'in_progress' })).resolves.toMatchObject({
      status: 'in_progress',
    });
  });

  // triste
  /* Gestor contribui, mas NUNCA finaliza nem inativa — resolver/cancelar é exclusivo de
     quem administra a área (#13). */
  it('refuses a "manager" cargo to resolve a ticket', async () => {
    const update = vi.fn();
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'manager' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      update,
      contextRolesFor,
    });

    await expect(service.update(ana, 7, { status: 'resolved' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a "manager" cargo to cancel a ticket', async () => {
    const update = vi.fn();
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'manager' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      update,
      contextRolesFor,
    });

    await expect(service.update(ana, 7, { status: 'cancelled' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  // feliz
  it('lets an "admin" cargo resolve a ticket', async () => {
    const update = vi.fn().mockResolvedValue(ticketRow({ status: 'resolved' }));
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'admin' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      update,
      contextRolesFor,
    });

    await expect(service.update(ana, 7, { status: 'resolved' })).resolves.toMatchObject({
      status: 'resolved',
    });
  });

  /* O super administrador resolve, cancela e reclassifica QUALQUER chamado, mesmo sem
     nenhuma linha de cargo interno na área — é o único papel sem fronteira (#13). Se
     `contextRolesFor` fosse chamado aqui, o bypass teria vazado para uma consulta ao banco. */
  it('lets a superadmin resolve, cancel and reclassify a ticket with zero cargo anywhere', async () => {
    const superadmin: RequestUser = { ...ana, role: 'superadmin' };
    const update = vi.fn().mockResolvedValue(ticketRow({ status: 'resolved' }));
    const contextRolesFor = vi.fn();
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'manutencao' })),
      update,
      contextRolesFor,
    });

    await expect(service.update(superadmin, 7, { status: 'resolved' })).resolves.toMatchObject({
      status: 'resolved',
    });
    await expect(
      service.update(superadmin, 7, { status: 'cancelled' }),
    ).resolves.toMatchObject({ status: 'resolved' });
    await expect(
      service.update(superadmin, 7, { area: 'infra' }),
    ).resolves.toMatchObject({ status: 'resolved' });
    expect(contextRolesFor).not.toHaveBeenCalled();
  });

  // triste
  it('refuses to add a participant area without being a manager of the current one', async () => {
    const addArea = vi.fn();
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'user' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      addArea,
      contextRolesFor,
    });

    await expect(service.addArea(ana, 7, 'manutencao')).rejects.toThrow(ForbiddenException);
    expect(addArea).not.toHaveBeenCalled();
  });

  // feliz
  it('lets a manager add a participant area', async () => {
    const addArea = vi.fn().mockResolvedValue(undefined);
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'manager' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      addArea,
      contextRolesFor,
    });

    const ticket = await service.addArea(ana, 7, 'manutencao');

    expect(addArea).toHaveBeenCalledWith({ ticketId: 7, area: 'manutencao', createdBy: ana.email });
    expect(ticket.participantAreas).toEqual(['manutencao']);
  });

  it('refuses to add the original area as a participant', async () => {
    const addArea = vi.fn();
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'manager' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      addArea,
      contextRolesFor,
    });

    await expect(service.addArea(ana, 7, 'infra')).rejects.toThrow(UnprocessableEntityException);
    expect(addArea).not.toHaveBeenCalled();
  });

  it('lets a manager remove a participant area', async () => {
    const removeArea = vi.fn().mockResolvedValue(undefined);
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'manager' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      listAreasOf: vi.fn().mockResolvedValue(['manutencao']),
      removeArea,
      contextRolesFor,
    });

    const ticket = await service.removeArea(ana, 7, 'manutencao');

    expect(removeArea).toHaveBeenCalledWith(7, 'manutencao');
    expect(ticket.participantAreas).toEqual([]);
  });
});

describe('TicketsService.myAreas', () => {
  // feliz
  it('lists only the areas the person has a role in', async () => {
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'user', sistema: 'manager' });
    const service = makeService({ contextRolesFor });

    await expect(service.myAreas(ana)).resolves.toEqual(['infra', 'sistema']);
  });

  it('gives a superadmin all three areas without reading internal_roles', async () => {
    const contextRolesFor = vi.fn();
    const service = makeService({ contextRolesFor });

    const areas = await service.myAreas({ ...ana, role: 'superadmin' });

    expect(areas).toEqual(expect.arrayContaining(['infra', 'sistema', 'manutencao']));
    expect(contextRolesFor).not.toHaveBeenCalled();
  });

  // triste
  it('gives nobody an area they have no role in', async () => {
    const contextRolesFor = vi.fn().mockResolvedValue({});
    const service = makeService({ contextRolesFor });

    await expect(service.myAreas(ana)).resolves.toEqual([]);
  });

  /* "Admin faz tudo no contexto DELE" — sem cargo em área nenhuma, um admin global não é
     diferente de qualquer outro papel sem cargo. */
  it('gives a plain global admin nothing without area cargo', async () => {
    const contextRolesFor = vi.fn().mockResolvedValue({});
    const service = makeService({ contextRolesFor });

    await expect(service.myAreas({ ...ana, role: 'admin' })).resolves.toEqual([]);
  });

  it('refuses an unidentified request without touching the repository', async () => {
    const contextRolesFor = vi.fn();
    const service = makeService({ contextRolesFor });

    await expect(service.myAreas(noRole)).rejects.toThrow(ForbiddenException);
    expect(contextRolesFor).not.toHaveBeenCalled();
  });
});
