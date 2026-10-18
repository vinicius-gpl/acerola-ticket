import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  type CreateTicketInput,
  ticketListQuerySchema,
} from '@template/shared/schemas/ticket.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type Env } from '../../../lib/config/env.schema';

import { type FileStorage } from '../../../lib/storage/file-storage.type';
import { MemoryStorage } from '../../../lib/storage/memory-storage';
import { StagedUploadsService } from '../../../lib/storage/staged-uploads.service';
import { type TicketsRepository, type TicketWithComputer } from '../repository/tickets.repository';
import { type TicketHistoriesRepository } from '../repository/ticket-histories.repository';
import { TicketAccessService } from './ticket-access.service';
import { type TicketAssigneesService } from './ticket-assignees.service';
import { type TicketAttachmentsService } from './ticket-attachments.service';
import { type TicketHistoriesService } from './ticket-histories.service';
import { signTicketAccess, signTicketInvite } from './ticket-invite.util';
import { type TicketWhatsappNotifierService } from './ticket-whatsapp-notifier.service';
import { type GithubService } from '../../software-projects/service/github.service';
import { type SoftwareProjectsService } from '../../software-projects/service/software-projects.service';
import { TicketsService } from './tickets.service';

const ana: RequestUser = { id: '1', email: 'ana@azuos.com.br', name: 'Ana', role: 'user' };

/** Ninguém identificado: é o que o guard bloquearia antes, e o que a policy recusa aqui. */
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

const CREATED_AT = new Date('2026-03-01T08:00:00.000Z');

function ticketRow(overrides: Partial<TicketWithComputer> = {}): TicketWithComputer {
  return {
    id: 7,
    status: 'open',
    priority: 'medium',
    requesterId: null,
    requesterEmail: null,
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
    assigneeId: null,
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
  downloadUrl: vi.fn().mockResolvedValue('https://r2.example/signed'),
};

/* A área temporária de verdade, sobre o storage em memória: é por ela que o print chega. */
const stagingStub = new StagedUploadsService(new MemoryStorage());

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

/* A linha do tempo tem serviço e testes próprios (`ticket-histories.service.test`). Aqui só
   se confere que o chamado a alimenta: a abertura ao nascer, a alteração ao ser corrigido. */
const historiesStub = {
  recordOpening: vi.fn().mockResolvedValue(undefined),
  listPublic: vi.fn().mockResolvedValue([]),
};

const historiesRepositoryStub = { record: vi.fn().mockResolvedValue({}) };

function makeService(
  repository: Partial<TicketsRepository>,
  storage: Partial<FileStorage> = storageStub,
  attachments: Partial<TicketAttachmentsService> = attachmentsStub,
  github: Partial<GithubService> = {},
  softwareProjects: Partial<SoftwareProjectsService> = {},
  staging: StagedUploadsService = stagingStub,
) {
  const tickets = { ...defaultRepository, ...repository } as TicketsRepository;

  /* O acesso por área é o de VERDADE, sobre o mesmo repository fingido: é a regra que estes
     testes exercitam, e um duplo dela testaria o duplo. */
  return new TicketsService(
    tickets,
    storage as FileStorage,
    staging,
    attachments as TicketAttachmentsService,
    new TicketAccessService(tickets),
    historiesStub as unknown as TicketHistoriesService,
    historiesRepositoryStub as unknown as TicketHistoriesRepository,
    github as GithubService,
    softwareProjects as SoftwareProjectsService,
  );
}

const query = (overrides: Record<string, unknown> = {}) => ticketListQuerySchema.parse(overrides);

const SCREENSHOT_KEY = 'tmp/00000000-0000-4000-8000-000000000001.png';

/**
 * O print que o navegador já enviou: o storage em memória com o arquivo na área temporária, e
 * o serviço montado sobre ele.
 */
async function withSentScreenshot(
  repository: Partial<TicketsRepository>,
  file: { contentType: string; sizeBytes: number } = { contentType: 'image/png', sizeBytes: 1024 },
) {
  const storage = new MemoryStorage();
  await storage.put(SCREENSHOT_KEY, Buffer.alloc(file.sizeBytes), file.contentType);
  const service = makeService(
    repository,
    storage,
    attachmentsStub,
    {},
    {},
    new StagedUploadsService(storage),
  );

  return { storage, service, screenshot: { storageKey: SCREENSHOT_KEY, fileName: 'erro.png' } };
}

const openingInput: CreateTicketInput = {
  requesterName: 'Bia Costa',
  area: 'infra',
  department: 'financeiro',
  problemType: 'printer',
  contactPhone: '62999999999',
  description: 'A impressora não puxa papel.',
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
  it('opens a ticket for whoever is logged in', async () => {
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

  it('links a system ticket to the chosen project and schedules its GitHub issue', async () => {
    const insert = vi.fn().mockResolvedValue(
      ticketRow({
        area: 'sistema',
        projectId: 8,
        problemType: 'bug',
        description: 'O sistema não carrega.',
      }),
    );
    const isTicketOption = vi.fn().mockResolvedValue(true);
    const syncTicketToIssueInBackground = vi.fn();
    const service = makeService(
      { insert },
      storageStub,
      attachmentsStub,
      { syncTicketToIssueInBackground },
      { isTicketOption },
    );

    await service.create({
      requesterName: 'Bia Costa',
      area: 'sistema',
      department: 'financeiro',
      problemType: 'bug',
      contactPhone: '62999999999',
      description: 'O sistema não carrega.',
      projectId: '8',
    });

    expect(insert.mock.calls[0]?.[0]).toMatchObject({ projectId: 8 });
    expect(isTicketOption).toHaveBeenCalledWith(8);
    expect(syncTicketToIssueInBackground).toHaveBeenCalledWith(
      7,
      8,
      'CH-0007',
      'Chamado CH-0007 - bug',
      'O sistema não carrega.',
      'Bia Costa',
    );
  });

  /* A linha do tempo começa na abertura: sem ela, o primeiro histórico do chamado seria o
     de quem atendeu, e o relatório não diria quando nem por quem ele foi aberto. */
  it('starts the timeline with the opening', async () => {
    historiesStub.recordOpening.mockClear();
    const service = makeService({ insert: vi.fn().mockResolvedValue(ticketRow()) });

    await service.create({
      requesterName: 'Bia Costa',
      area: 'infra' as const,
      department: 'financeiro',
      problemType: 'printer',
      contactPhone: '62999999999',
      description: 'A impressora não puxa papel.',
    });

    expect(historiesStub.recordOpening).toHaveBeenCalledWith(expect.objectContaining({ id: 7 }));
  });

  it('moves the screenshot out of the staging area and keeps its key on the ticket', async () => {
    const insert = vi.fn().mockResolvedValue(ticketRow());
    const { storage, service, screenshot } = await withSentScreenshot({ insert });

    await service.create({ ...openingInput, screenshot });

    const key = insert.mock.calls[0]?.[0].screenshotKey as string;
    expect(key).toMatch(/^tickets\/[0-9a-f-]{36}\.png$/);
    expect(await storage.head(key)).not.toBeNull();
    expect(await storage.head(SCREENSHOT_KEY)).toBeNull();
  });

  // triste
  it('refuses a screenshot that is not an image, without opening the ticket', async () => {
    const insert = vi.fn();
    const { storage, service, screenshot } = await withSentScreenshot(
      { insert },
      { contentType: 'application/x-msdownload', sizeBytes: 1024 },
    );

    const attempt = service.create({ ...openingInput, screenshot });

    await expect(attempt).rejects.toThrow(UnprocessableEntityException);
    expect(insert).not.toHaveBeenCalled();
    expect(storage.size).toBe(0);
  });

  /* A tela declarou um print pequeno; o link aceita o que for enviado. Vale o que o storage mediu. */
  it('refuses a screenshot that turned out bigger than the ceiling', async () => {
    const insert = vi.fn();
    const { service, screenshot } = await withSentScreenshot(
      { insert },
      { contentType: 'image/png', sizeBytes: 9 * 1024 * 1024 },
    );

    await expect(service.create({ ...openingInput, screenshot })).rejects.toThrow(/8 MB/);
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses a screenshot that never reached the storage', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });
    const missing = { storageKey: SCREENSHOT_KEY, fileName: 'erro.png' };

    await expect(service.create({ ...openingInput, screenshot: missing })).rejects.toThrow(
      NotFoundException,
    );
    expect(insert).not.toHaveBeenCalled();
  });

  /* O pedido de usuário do WhatsApp (`/acesso`) é de Sistema, mas sem sistema ainda. */
  it('opens a user request in Sistema without a project', async () => {
    const insert = vi
      .fn()
      .mockResolvedValue(
        ticketRow({ area: 'sistema', problemType: 'access_request', projectId: null }),
      );
    const isTicketOption = vi.fn();
    const service = makeService({ insert }, storageStub, attachmentsStub, undefined, {
      isTicketOption,
    });

    await service.create({
      requesterName: 'Bia Costa',
      area: 'sistema',
      department: 'financeiro',
      problemType: 'access_request',
      contactPhone: '62999999999',
      description: 'Pedido de usuário.',
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(isTicketOption).not.toHaveBeenCalled();
  });

  // triste
  it('still refuses any other Sistema ticket without a project', async () => {
    const service = makeService({ insert: vi.fn() }, storageStub, attachmentsStub, undefined, {
      isTicketOption: vi.fn(),
    });

    await expect(
      service.create({
        requesterName: 'Bia Costa',
        area: 'sistema',
        department: 'financeiro',
        problemType: 'bug',
        contactPhone: '62999999999',
        description: 'O sistema não carrega.',
      }),
    ).rejects.toThrow('Selecione um sistema disponível');
  });
});

describe('TicketsService.findByProtocol', () => {
  // feliz
  it('finds the ticket from the protocol as it was printed', async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(ticketRow()) });

    await expect(service.findByProtocol(ana, 'CH-0007')).resolves.toMatchObject({
      protocol: 'CH-0007',
    });
  });

  it('accepts the protocol typed from memory, with no dash and no zeros', async () => {
    const findById = vi.fn().mockResolvedValue(ticketRow());
    const service = makeService({ findById });

    await service.findByProtocol(ana, '7');

    expect(findById).toHaveBeenCalledWith(7);
  });

  // triste
  it('never exposes the phone, the assignee or the solution on a public lookup', async () => {
    const answered = ticketRow({ assignee: 'Carlos do TI', solution: 'Troquei o rolete.' });
    const service = makeService({ findById: vi.fn().mockResolvedValue(answered) });

    const ticket = await service.findByProtocol(ana, 'CH-0007');

    expect(ticket).not.toHaveProperty('contactPhone');
    expect(ticket).not.toHaveProperty('assignee');
    expect(ticket).not.toHaveProperty('solution');
  });

  /* O anexo de um histórico sai DENTRO dele; fora ficam só os arquivos do próprio chamado.
     É o que impede o arquivo de um histórico escondido de vazar pela lista geral. */
  it('keeps the files of a history out of the ticket own files', async () => {
    const file = (id: number, historyId: number | null) => ({ id, historyId });
    const service = makeService({ findById: vi.fn().mockResolvedValue(ticketRow()) }, storageStub, {
      ...attachmentsStub,
      list: vi.fn().mockResolvedValue([file(1, null), file(2, 31)]),
    });

    const ticket = await service.findByProtocol(ana, 'CH-0007');

    expect(ticket.attachments.map((attachment) => attachment.id)).toEqual([1]);
  });

  it('refuses text with no number without going to the database', async () => {
    const findById = vi.fn();
    const service = makeService({ findById });

    await expect(service.findByProtocol(ana, 'meu chamado')).rejects.toThrow(NotFoundException);
    expect(findById).not.toHaveBeenCalled();
  });

  it('says not found for a protocol that does not exist', async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(null) });

    await expect(service.findByProtocol(ana, 'CH-9999')).rejects.toThrow(NotFoundException);
  });
});

describe('TicketsService.update', () => {
  // feliz
  it('corrects the ticket data and stamps who did it', async () => {
    const update = vi.fn().mockResolvedValue(ticketRow({ priority: 'high' }));
    const service = makeService({ findById: vi.fn().mockResolvedValue(ticketRow()), update });

    await service.update(ana, 7, { priority: 'high' });

    expect(update.mock.calls[0]?.[1]).toMatchObject({ priority: 'high', updatedBy: ana.email });
  });

  it('leaves what changed on the timeline, signed by who changed it', async () => {
    historiesRepositoryStub.record.mockClear();
    const update = vi.fn().mockResolvedValue(ticketRow({ priority: 'high' }));
    const service = makeService({ findById: vi.fn().mockResolvedValue(ticketRow()), update });

    await service.update(ana, 7, { priority: 'high' });

    expect(historiesRepositoryStub.record).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'update',
        description: 'Urgência: Média → Alta',
        authorName: 'Ana',
        createdBy: ana.email,
        isVisibleToRequester: false,
      }),
    );
  });

  // triste
  /* Salvar sem mudar nada não deixa rastro: uma linha do tempo cheia de "alteração" vazia
     esconde as que importam. */
  it('writes nothing on the timeline when nothing really changed', async () => {
    historiesRepositoryStub.record.mockClear();
    const update = vi.fn().mockResolvedValue(ticketRow());
    const service = makeService({ findById: vi.fn().mockResolvedValue(ticketRow()), update });

    await service.update(ana, 7, { priority: 'medium' });

    expect(historiesRepositoryStub.record).not.toHaveBeenCalled();
  });

  it('refuses an unidentified request without touching the repository', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn(), update });

    await expect(service.update(noRole, 7, { priority: 'high' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('does not write when the ticket does not exist', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), update });

    await expect(service.update(ana, 99, { priority: 'high' })).rejects.toThrow(NotFoundException);
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

  /* O contexto do menu (#13): os números de cima são DA ÁREA em que a pessoa está, ou o
     "98 abertos" de Infraestrutura apareceria sobre a fila de Manutenção. */
  it('narrows the metrics to the area asked for', async () => {
    const listForMetrics = vi.fn().mockResolvedValue([]);
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'user', manutencao: 'manager' });
    const service = makeService({ listForMetrics, contextRolesFor });

    await service.dashboard(ana, 'manutencao');

    expect(listForMetrics).toHaveBeenCalledWith(['manutencao']);
  });

  // triste
  /* Pedir uma área sem cargo não devolve a de outra pessoa: devolve nada. Zerado, e não 403,
     porque é leitura de contexto do menu — ver o comentário no service. */
  it('gives zeroed metrics for an area the person does not serve', async () => {
    const listForMetrics = vi.fn().mockResolvedValue([]);
    const service = makeService({ listForMetrics });

    const dashboard = await service.dashboard(ana, 'manutencao');

    expect(listForMetrics).toHaveBeenCalledWith([]);
    expect(dashboard.total).toBe(0);
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
  const superadmin: RequestUser = {
    ...ana,
    id: '3',
    email: 'root@azuos.com.br',
    role: 'superadmin',
  };
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
  it('refuses a "user" cargo to write anything at all, not even the urgency', async () => {
    const update = vi.fn();
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'user' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      update,
      contextRolesFor,
    });

    await expect(service.update(ana, 7, { priority: 'high' })).rejects.toThrow(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });

  // feliz
  it('lets a "manager" cargo correct the ticket data', async () => {
    const update = vi.fn().mockResolvedValue(ticketRow({ priority: 'high' }));
    const contextRolesFor = vi.fn().mockResolvedValue({ infra: 'manager' });
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'infra' })),
      update,
      contextRolesFor,
    });

    await expect(service.update(ana, 7, { priority: 'high' })).resolves.toMatchObject({
      priority: 'high',
    });
  });

  /* O super administrador corrige e reclassifica QUALQUER chamado, mesmo sem nenhuma linha
     de cargo interno na área — é o único papel sem fronteira (#13). Se `contextRolesFor`
     fosse chamado aqui, o bypass teria vazado para uma consulta ao banco. */
  it('lets a superadmin correct and reclassify a ticket with zero cargo anywhere', async () => {
    const superadmin: RequestUser = { ...ana, role: 'superadmin' };
    const update = vi.fn().mockResolvedValue(ticketRow({ area: 'infra' }));
    const contextRolesFor = vi.fn();
    const service = makeService({
      findById: vi.fn().mockResolvedValue(ticketRow({ area: 'manutencao' })),
      update,
      contextRolesFor,
    });

    await expect(service.update(superadmin, 7, { priority: 'high' })).resolves.toMatchObject({
      id: 7,
    });
    await expect(service.update(superadmin, 7, { area: 'infra' })).resolves.toMatchObject({
      area: 'infra',
    });
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

/* ─────────────────────────────────────────────────────────────────────────────────────────
   O RESPONSÁVEL e o WhatsApp: escolhido na abertura, trocado pelo super admin, o convite e o
   link de consulta que chegam pelo WhatsApp, e o aviso de chamado pronto.

   Estes caminhos montam o serviço com três dependências que os de cima não usam (quem atende
   cada área, quem avisa, e o segredo que assina os links) — por isso têm fábrica própria.
   ───────────────────────────────────────────────────────────────────────────────────────── */

const LINK_SECRET = 's'.repeat(40);
const LINK_NOW = 1_800_000_000;

const rootUser: RequestUser = {
  id: 'u-root',
  email: 'root@exemplo.com',
  name: 'Root',
  role: 'superadmin',
};
const adminUser: RequestUser = {
  id: 'u-ana',
  email: 'ana@exemplo.com',
  name: 'Ana Lima',
  role: 'admin',
};

const openInput = {
  requesterName: 'Bia Costa',
  area: 'infra' as const,
  department: 'financeiro' as const,
  problemType: 'printer' as const,
  contactPhone: '62999990002',
  description: 'A impressora não puxa papel.',
};

function makeAssigneeService(
  options: { attends?: boolean; areas?: string[]; roles?: Record<string, string> } = {},
) {
  const repository = {
    insert: vi.fn(async (values: Partial<TicketWithComputer>) => ticketRow(values)),
    update: vi.fn(async (_id: number, values: Partial<TicketWithComputer>) => ticketRow(values)),
    findById: vi.fn().mockResolvedValue(ticketRow({ notifyWhatsapp: true })),
    listAreasOf: vi.fn().mockResolvedValue([]),
    listAreasFor: vi.fn().mockResolvedValue(new Map()),
    contextRolesFor: vi
      .fn()
      .mockResolvedValue(
        options.roles ?? { infra: 'admin', sistema: 'admin', manutencao: 'admin' },
      ),
  };
  const assignees = {
    resolve: vi
      .fn()
      .mockResolvedValue(options.attends === false ? null : { id: 'u-ana', name: 'Ana Lima' }),
    listForArea: vi.fn().mockResolvedValue([{ id: 'u-ana', name: 'Ana Lima' }]),
    areasOf: vi.fn().mockResolvedValue({ name: 'Ana Lima', areas: options.areas ?? ['infra'] }),
  };
  const notifier = {
    opened: vi.fn().mockResolvedValue('sent'),
    ready: vi.fn().mockResolvedValue('sent'),
    notices: vi.fn().mockResolvedValue([{ id: 4, status: 'failed' }]),
    retry: vi.fn().mockResolvedValue({ id: 4, status: 'pending' }),
  };
  const tickets = repository as unknown as TicketsRepository;
  const service = new TicketsService(
    tickets,
    storageStub as unknown as FileStorage,
    stagingStub,
    attachmentsStub as unknown as TicketAttachmentsService,
    new TicketAccessService(tickets),
    historiesStub as unknown as TicketHistoriesService,
    historiesRepositoryStub as unknown as TicketHistoriesRepository,
    undefined,
    undefined,
    assignees as unknown as TicketAssigneesService,
    notifier as unknown as TicketWhatsappNotifierService,
    { BOT_API_TOKEN: LINK_SECRET } as Env,
  );

  return { service, repository, assignees, notifier };
}

describe('TicketsService.create with a chosen assignee', () => {
  // feliz
  /* O NOME vem do cadastro de quem atende, nunca do corpo: só o id é aceito de fora. */
  it('records the chosen person as assignee, by the name on file, and announces the opening', async () => {
    const { service, repository, assignees, notifier } = makeAssigneeService();

    const ticket = await service.create({ ...openInput, assigneeId: 'u-ana' });

    expect(assignees.resolve).toHaveBeenCalledWith('infra', 'u-ana');
    expect(repository.insert.mock.calls[0]?.[0]).toMatchObject({
      assignee: 'Ana Lima',
      assigneeId: 'u-ana',
    });
    expect(ticket.assigneeId).toBe('u-ana');
    expect(notifier.opened).toHaveBeenCalledOnce();
    /* O desfecho do aviso volta com o chamado: é o que deixa a tela dizer "enviamos". */
    expect(ticket.openingNotice).toBe('sent');
  });

  /* O aviso que falhou não derruba a abertura: o chamado nasce, e o desfecho diz que não saiu. */
  it('still opens the ticket when the notice blows up, and says it did not go out', async () => {
    const { service, notifier } = makeAssigneeService();
    notifier.opened.mockRejectedValue(new Error('bot down'));

    const ticket = await service.create({ ...openInput, assigneeId: 'u-ana' });

    expect(ticket.protocol).toBe('CH-0007');
    expect(ticket.openingNotice).toBe('failed');
  });

  it('opens without an assignee when nobody was chosen', async () => {
    const { service, repository, assignees } = makeAssigneeService();

    await service.create(openInput);

    expect(assignees.resolve).not.toHaveBeenCalled();
    expect(repository.insert.mock.calls[0]?.[0]).toMatchObject({
      assignee: null,
      assigneeId: null,
    });
  });

  it('skips the opening notice when asked to', async () => {
    const { service, notifier } = makeAssigneeService();

    await service.create({ ...openInput, assigneeId: 'u-ana' }, { skipOpeningNotice: true });

    expect(notifier.opened).not.toHaveBeenCalled();
  });

  // triste
  /* O id vem de uma tela pública: quem não atende a área não vira responsável só por pedir. */
  it('refuses a chosen person who does not attend the area, and creates nothing', async () => {
    const { service, repository } = makeAssigneeService({ attends: false });

    await expect(service.create({ ...openInput, assigneeId: 'u-outro' })).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(repository.insert).not.toHaveBeenCalled();
  });
});

describe('TicketsService.update of the assignee', () => {
  // feliz
  it('lets the super admin hand the ticket to someone who attends the area', async () => {
    const { service, repository } = makeAssigneeService();

    await service.update(rootUser, 7, { assigneeId: 'u-ana' });

    expect(repository.update.mock.calls[0]?.[1]).toMatchObject({
      assignee: 'Ana Lima',
      assigneeId: 'u-ana',
    });
  });

  // triste
  /* Escalada de privilégio: admin comum não escolhe o responsável — nem a si mesmo. */
  it('refuses an admin who tries to change the assignee', async () => {
    const { service, repository } = makeAssigneeService();

    await expect(service.update(adminUser, 7, { assigneeId: 'u-ana' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('refuses a new assignee who does not attend the area', async () => {
    const { service, repository } = makeAssigneeService({ attends: false });

    await expect(service.update(rootUser, 7, { assigneeId: 'u-outro' })).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('leaves the assignee alone when the edit does not mention it', async () => {
    const { service, repository, assignees } = makeAssigneeService();

    await service.update(adminUser, 7, { priority: 'high' });

    expect(assignees.resolve).not.toHaveBeenCalled();
    expect(repository.update.mock.calls[0]?.[1]).not.toHaveProperty('assigneeId');
  });
});

describe('TicketsService.readInvite', () => {
  const token = signTicketInvite(
    { assigneeId: 'u-ana', phone: '5562999990002', expiresAt: LINK_NOW + 1800 },
    LINK_SECRET,
  );

  // feliz
  it('tells who the attendant is, the areas and the phone carried by the link', async () => {
    const { service } = makeAssigneeService({ areas: ['infra', 'manutencao'] });

    expect(await service.readInvite(token, LINK_NOW)).toEqual({
      assignee: { id: 'u-ana', name: 'Ana Lima' },
      areas: ['infra', 'manutencao'],
      phone: '5562999990002',
    });
  });

  // triste
  it('refuses a link that expired or was tampered with', async () => {
    const { service } = makeAssigneeService();

    await expect(service.readInvite(token, LINK_NOW + 1801)).rejects.toThrow(NotFoundException);
    await expect(service.readInvite(`${token}x`, LINK_NOW)).rejects.toThrow(NotFoundException);
    await expect(service.readInvite('lixo', LINK_NOW)).rejects.toThrow(NotFoundException);
  });

  /* Quem mandou o link deixou de atender: o convite deixa de valer junto. */
  it('refuses a link of someone who no longer attends any area', async () => {
    const { service } = makeAssigneeService({ areas: [] });

    await expect(service.readInvite(token, LINK_NOW)).rejects.toThrow(NotFoundException);
  });
});

describe('TicketsService.findByAccessToken', () => {
  // feliz
  it('opens the ticket of a signed link, with the public fields only', async () => {
    const { service, repository } = makeAssigneeService();

    const ticket = await service.findByAccessToken(ana, signTicketAccess(7, LINK_SECRET));

    expect(repository.findById).toHaveBeenCalledWith(7);
    expect(ticket.protocol).toBe('CH-0007');
    expect(ticket).not.toHaveProperty('contactPhone');
  });

  // triste
  /* Trocar o número dentro do link não abre o chamado de outra pessoa. */
  it('refuses a link that was tampered with, without reading any ticket', async () => {
    const { service, repository } = makeAssigneeService();

    await expect(
      service.findByAccessToken(ana, `${signTicketAccess(7, LINK_SECRET)}x`),
    ).rejects.toThrow(NotFoundException);
    await expect(service.findByAccessToken(ana, 'lixo')).rejects.toThrow(NotFoundException);
    expect(repository.findById).not.toHaveBeenCalled();
  });
});

describe('TicketsService.notifyReady', () => {
  // feliz
  it('hands back how the notice went', async () => {
    const { service, notifier } = makeAssigneeService();

    expect(await service.notifyReady(adminUser, 7)).toEqual({ outcome: 'sent' });
    expect(notifier.ready).toHaveBeenCalledOnce();
  });

  // triste
  /* Quem só consulta a área não dispara mensagem pelo número de ninguém. */
  it('refuses who can only read the area of the ticket', async () => {
    const { service, notifier } = makeAssigneeService({ roles: { infra: 'user' } });
    const regular: RequestUser = { id: 'u-x', email: 'x@exemplo.com', name: 'X', role: 'user' };

    await expect(service.notifyReady(regular, 7)).rejects.toThrow(ForbiddenException);
    expect(notifier.ready).not.toHaveBeenCalled();
  });
});

describe('TicketsService WhatsApp notices', () => {
  // feliz
  it('lists the notices of a ticket the person attends', async () => {
    const { service, notifier } = makeAssigneeService();

    expect(await service.whatsappNotices(adminUser, 7)).toEqual([{ id: 4, status: 'failed' }]);
    expect(notifier.notices).toHaveBeenCalledWith(7);
  });

  it('puts a stopped notice back in the queue', async () => {
    const { service, notifier } = makeAssigneeService();

    expect(await service.retryWhatsappNotice(adminUser, 7, 4)).toEqual({
      id: 4,
      status: 'pending',
    });
    expect(notifier.retry).toHaveBeenCalledWith(7, 4);
  });

  // triste
  /* Reenviar é mandar mensagem pelo número de alguém: quem só consulta não pode. */
  it('refuses the retry to who can only read the area of the ticket', async () => {
    const { service, notifier } = makeAssigneeService({ roles: { infra: 'user' } });
    const regular: RequestUser = { id: 'u-x', email: 'x@exemplo.com', name: 'X', role: 'user' };

    await expect(service.retryWhatsappNotice(regular, 7, 4)).rejects.toThrow(ForbiddenException);
    expect(notifier.retry).not.toHaveBeenCalled();
  });

  it('says why when the notice is queued or already sent', async () => {
    const { service, notifier } = makeAssigneeService();
    notifier.retry.mockResolvedValueOnce(null);

    await expect(service.retryWhatsappNotice(adminUser, 7, 4)).rejects.toThrow(ConflictException);
  });
});

describe('TicketsService — quem pede, logado', () => {
  const bia: RequestUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'bia@exemplo.com',
    name: 'Bia Costa',
    role: 'user',
  };
  /* Bia não atende área nenhuma: é só quem pede. */
  const noAreas = { contextRolesFor: vi.fn().mockResolvedValue({}) };
  const input = {
    requesterName: 'Nome digitado no corpo',
    area: 'infra' as const,
    department: 'financeiro' as const,
    problemType: 'printer' as const,
    contactPhone: '62999999999',
    description: 'A impressora não puxa papel.',
  };

  // feliz
  /* Autoria vem da identidade: o chamado é de quem está logado, com o nome da conta. */
  it('links the ticket to the person and takes the name from the identity, not the body', async () => {
    const insert = vi.fn().mockResolvedValue(ticketRow());
    const service = makeService({ insert });

    await service.create(input, {
      requester: { id: bia.id, email: bia.email, name: bia.name },
    });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        requesterId: bia.id,
        requesterEmail: bia.email,
        requesterName: 'Bia Costa',
      }),
    );
  });

  it('lets the person look up her own ticket by number, without attending any area', async () => {
    const service = makeService({
      ...noAreas,
      findById: vi.fn().mockResolvedValue(ticketRow({ requesterId: bia.id })),
    });

    await expect(service.findByProtocol(bia, 'CH-0007')).resolves.toMatchObject({ id: 7 });
  });

  it('lists the tickets the person opened', async () => {
    const listByRequester = vi.fn().mockResolvedValue([ticketRow({ requesterId: bia.id })]);
    const service = makeService({ listByRequester });

    const mine = await service.listMine(bia);

    expect(listByRequester).toHaveBeenCalledWith(bia.id);
    expect(mine).toEqual([expect.objectContaining({ id: 7, protocol: 'CH-0007' })]);
  });

  /* O nome é da conta; telefone e departamento vêm do último chamado que ela abriu. */
  it('prefills the form from the account and the last ticket', async () => {
    const lastContactOf = vi
      .fn()
      .mockResolvedValue({ contactPhone: '62988887777', department: 'fiscal' });
    const service = makeService({ lastContactOf });

    await expect(service.requesterDefaults(bia)).resolves.toEqual({
      name: 'Bia Costa',
      email: bia.email,
      phone: '62988887777',
      department: 'fiscal',
    });
    expect(lastContactOf).toHaveBeenCalledWith(bia.id);
  });

  // triste
  /* 404, e não 403: dizer "é de outra pessoa" contaria que o número existe. */
  it('hides the ticket of someone else from who does not attend its area', async () => {
    const service = makeService({
      ...noAreas,
      findById: vi.fn().mockResolvedValue(ticketRow({ requesterId: 'outra-pessoa' })),
    });

    await expect(service.findByProtocol(bia, 'CH-0007')).rejects.toThrow(NotFoundException);
  });

  /* Quem nunca abriu chamado digita telefone e departamento: só o nome vem da conta. */
  it('prefills only name and e-mail for who never opened a ticket', async () => {
    const service = makeService({ lastContactOf: vi.fn().mockResolvedValue(null) });

    await expect(service.requesterDefaults(bia)).resolves.toEqual({
      name: 'Bia Costa',
      email: bia.email,
      phone: null,
      department: null,
    });
  });
});
