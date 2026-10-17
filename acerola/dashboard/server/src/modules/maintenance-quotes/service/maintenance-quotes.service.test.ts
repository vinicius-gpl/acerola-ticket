import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { maintenanceQuoteListQuerySchema } from '@template/shared/schemas/maintenance-quote.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type MaintenanceQuoteRow } from '../../../lib/db/schema/maintenance-quotes.schema';
import { type FileStorage } from '../../../lib/storage/file-storage.type';
import { MemoryStorage } from '../../../lib/storage/memory-storage';
import { StagedUploadsService } from '../../../lib/storage/staged-uploads.service';
import { type MaintenanceQuotesRepository } from '../repository/maintenance-quotes.repository';
import { MaintenanceQuotesService } from './maintenance-quotes.service';

/* Quem cuida da Manutenção: cargo de GESTÃO na área, que é o que deixa mexer nos orçamentos. */
const keeper: RequestUser = {
  id: '1',
  email: 'ana@empresa.com.br',
  name: 'Ana',
  role: 'user',
  roles: { infra: 'user', sistema: 'user', manutencao: 'manager' },
};

/* Mesmo papel geral, cargo de CONSULTA na Manutenção: vê os orçamentos, não mexe neles. */
const viewer: RequestUser = {
  ...keeper,
  id: '2',
  email: 'bia@empresa.com.br',
  name: 'Bia',
  roles: { infra: 'user', sistema: 'user', manutencao: 'user' },
};

/* Gestor de OUTRA área: manda na dele, não no dinheiro da Manutenção (#13). */
const infraManager: RequestUser = {
  ...keeper,
  id: '3',
  email: 'caio@empresa.com.br',
  name: 'Caio',
  roles: { infra: 'admin', sistema: 'user', manutencao: 'user' },
};

/* Identidade PELA METADE: chegou sem papel. */
const noRole = { ...keeper, role: undefined, roles: undefined } as unknown as RequestUser;

function row(overrides: Partial<MaintenanceQuoteRow> = {}): MaintenanceQuoteRow {
  return {
    id: 1,
    supplier: 'Clima Frio Refrigeração',
    description: 'Recarga de gás do ar-condicionado da recepção',
    kind: 'service',
    amountCents: 48000,
    quotedOn: '2026-09-28',
    status: 'pending',
    decidedAt: null,
    note: null,
    attachmentKey: null,
    attachmentName: null,
    createdAt: new Date('2026-09-28T12:00:00.000Z'),
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

const DOCUMENT_KEY = 'tmp/00000000-0000-4000-8000-000000000001.pdf';

/** O que o navegador faz com o link: põe o documento na área temporária. Devolve o que vai no corpo. */
async function sentDocument(
  storage: MemoryStorage,
  file: { contentType: string; sizeBytes: number } = {
    contentType: 'application/pdf',
    sizeBytes: 2048,
  },
) {
  await storage.put(DOCUMENT_KEY, Buffer.alloc(file.sizeBytes), file.contentType);

  return { storageKey: DOCUMENT_KEY, fileName: 'orcamento.pdf' };
}

const input = {
  supplier: 'Clima Frio',
  description: 'Recarga de gás',
  kind: 'service',
  amountCents: 48000,
  quotedOn: '2026-09-28',
} as const;

const defaultRepository: Partial<MaintenanceQuotesRepository> = {
  list: vi.fn().mockResolvedValue({ rows: [row()], total: 1 }),
  findById: vi.fn().mockResolvedValue(row()),
  insert: vi.fn().mockResolvedValue(row()),
  update: vi.fn().mockResolvedValue(row()),
  remove: vi.fn().mockResolvedValue(undefined),
};

const defaultStorage: Partial<FileStorage> = {
  downloadUrl: vi.fn().mockResolvedValue('https://r2.exemplo/doc?assinatura'),
};

/**
 * O storage é o de memória, de verdade — com o que o teste quiser trocar por cima (uma falha,
 * um espião). Passar um `MemoryStorage` pronto deixa o teste olhar o que ficou nele.
 */
function makeService(
  repository: Partial<MaintenanceQuotesRepository> = {},
  storage: Partial<FileStorage> = {},
) {
  const memory = Object.assign(
    storage instanceof MemoryStorage ? storage : new MemoryStorage(),
    defaultStorage,
    storage instanceof MemoryStorage ? {} : storage,
  );

  return new MaintenanceQuotesService(
    { ...defaultRepository, ...repository } as MaintenanceQuotesRepository,
    new StagedUploadsService(memory),
    memory,
  );
}

const query = maintenanceQuoteListQuerySchema.parse({});

describe('MaintenanceQuotesService.list', () => {
  // feliz
  it('lists the quotes with the temporary link of each document', async () => {
    const service = makeService({
      list: vi.fn().mockResolvedValue({
        rows: [row({ attachmentKey: 'maintenance-quotes/a.pdf', attachmentName: 'a.pdf' })],
        total: 1,
      }),
    });

    const page = await service.list(viewer, query);

    expect(page.total).toBe(1);
    expect(page.items[0]?.attachmentUrl).toBe('https://r2.exemplo/doc?assinatura');
  });

  /* Falha no storage não pode derrubar a lista: o orçamento aparece sem o documento. */
  it('still lists the quotes when the document link cannot be created', async () => {
    const service = makeService(
      {
        list: vi.fn().mockResolvedValue({
          rows: [row({ attachmentKey: 'maintenance-quotes/a.pdf', attachmentName: 'a.pdf' })],
          total: 1,
        }),
      },
      { downloadUrl: vi.fn().mockRejectedValue(new Error('r2 fora do ar')) },
    );

    const page = await service.list(viewer, query);

    expect(page.items[0]?.attachmentUrl).toBeNull();
  });

  // triste
  it('refuses an unidentified request without touching the repository', async () => {
    const list = vi.fn();
    const service = makeService({ list });

    await expect(service.list(noRole, query)).rejects.toThrow(ForbiddenException);
    expect(list).not.toHaveBeenCalled();
  });
});

describe('MaintenanceQuotesService.create', () => {
  // feliz
  it('keeps the quote stamping the authorship from the identity', async () => {
    const insert = vi.fn().mockResolvedValue(row());
    const service = makeService({ insert });

    await service.create(keeper, input);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ supplier: 'Clima Frio', createdBy: 'ana@empresa.com.br' }),
    );
  });

  it('moves the document out of the staging area and keeps its key and its name', async () => {
    const insert = vi.fn().mockResolvedValue(row());
    const storage = new MemoryStorage();
    const service = makeService({ insert }, storage);

    await service.create(keeper, { ...input, attachment: await sentDocument(storage) });

    const values = insert.mock.calls[0]?.[0];
    expect(values.attachmentKey).toMatch(/^maintenance-quotes\/[0-9a-f-]{36}\.pdf$/);
    expect(values.attachmentName).toBe('orcamento.pdf');
    expect(await storage.head(values.attachmentKey)).not.toBeNull();
    expect(await storage.head(DOCUMENT_KEY)).toBeNull();
  });

  // feliz
  it('hands the document upload link to whoever manages the area', async () => {
    const service = makeService();

    const ticket = await service.createAttachmentUploadTicket(keeper, {
      fileName: 'orcamento.pdf',
      contentType: 'application/pdf',
      sizeBytes: 2048,
    });

    expect(ticket.storageKey).toMatch(/^tmp\/[0-9a-f-]{36}\.pdf$/);
  });

  // triste
  it('gives no upload link to someone who only queries the area', async () => {
    const service = makeService();

    await expect(
      service.createAttachmentUploadTicket(viewer, {
        fileName: 'orcamento.pdf',
        contentType: 'application/pdf',
        sizeBytes: 2048,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  // triste
  /* ESCALADA DE PRIVILÉGIO: cargo de consulta na área não guarda orçamento (CONTRIBUTING §7). */
  it('refuses someone who only queries the area', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });

    await expect(service.create(viewer, input)).rejects.toThrow(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });

  /* ESCALADA DE PRIVILÉGIO: mandar em OUTRA área não dá acesso a esta. */
  it('refuses a manager of another area', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });

    await expect(service.create(infraManager, input)).rejects.toThrow(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses a file that is not an accepted document, and clears it from the staging area', async () => {
    const insert = vi.fn();
    const storage = new MemoryStorage();
    const service = makeService({ insert }, storage);
    const attachment = await sentDocument(storage, {
      contentType: 'application/zip',
      sizeBytes: 2048,
    });

    await expect(service.create(keeper, { ...input, attachment })).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(insert).not.toHaveBeenCalled();
    expect(storage.size).toBe(0);
  });

  /* A tela declarou um documento pequeno; o link aceita o que for enviado. Vale o medido. */
  it('refuses a document that turned out bigger than 10 MB', async () => {
    const insert = vi.fn();
    const storage = new MemoryStorage();
    const service = makeService({ insert }, storage);
    const attachment = await sentDocument(storage, {
      contentType: 'application/pdf',
      sizeBytes: 11 * 1024 * 1024,
    });

    await expect(service.create(keeper, { ...input, attachment })).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses a document that never reached the storage', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });
    const attachment = { storageKey: DOCUMENT_KEY, fileName: 'orcamento.pdf' };

    await expect(service.create(keeper, { ...input, attachment })).rejects.toThrow(
      NotFoundException,
    );
    expect(insert).not.toHaveBeenCalled();
  });

  it('lets a storage outage through when checking the document', async () => {
    const service = makeService(
      {},
      { head: vi.fn().mockRejectedValue(new TypeError('fetch failed')) },
    );
    const attachment = { storageKey: DOCUMENT_KEY, fileName: 'orcamento.pdf' };

    await expect(service.create(keeper, { ...input, attachment })).rejects.toThrow('fetch failed');
  });
});

describe('MaintenanceQuotesService.update', () => {
  // feliz
  it('changes the quote and drops the document that was replaced', async () => {
    const storage = new MemoryStorage();
    await storage.put('maintenance-quotes/velho.pdf', Buffer.from('a'), 'application/pdf');
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(row({ attachmentKey: 'maintenance-quotes/velho.pdf' })),
        update: vi.fn().mockResolvedValue(row({ attachmentKey: 'maintenance-quotes/novo.pdf' })),
      },
      storage,
    );

    await service.update(keeper, 1, { attachment: await sentDocument(storage) });

    expect(await storage.head('maintenance-quotes/velho.pdf')).toBeNull();
  });

  it('dates the decision when the quote is approved', async () => {
    const update = vi.fn().mockResolvedValue(row({ status: 'approved' }));
    const service = makeService({ update });

    await service.update(keeper, 1, { status: 'approved' });

    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'approved', decidedAt: expect.any(Date) }),
    );
  });

  /* O arquivo órfão custa centavos; devolver erro a quem só trocou o documento custa confiança. */
  it('does not fail the change when the old document cannot be deleted', async () => {
    const storage = Object.assign(new MemoryStorage(), {
      remove: vi.fn().mockRejectedValue(new Error('r2 fora do ar')),
    });
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(row({ attachmentKey: 'maintenance-quotes/velho.pdf' })),
        update: vi.fn().mockResolvedValue(row({ attachmentKey: 'maintenance-quotes/novo.pdf' })),
      },
      storage,
    );

    await expect(
      service.update(keeper, 1, { attachment: await sentDocument(storage) }),
    ).resolves.toBeTruthy();
  });

  // triste
  it('answers 404 for a quote that does not exist, without writing', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), update });

    await expect(service.update(keeper, 99, { status: 'approved' })).rejects.toThrow(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses the change for someone who only queries the area', async () => {
    const update = vi.fn();
    const service = makeService({ update });

    await expect(service.update(viewer, 1, { status: 'approved' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });
});

describe('MaintenanceQuotesService.remove', () => {
  // feliz
  it('deletes the quote and its document', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const storage = new MemoryStorage();
    await storage.put('maintenance-quotes/a.pdf', Buffer.from('a'), 'application/pdf');
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(row({ attachmentKey: 'maintenance-quotes/a.pdf' })),
        remove,
      },
      storage,
    );

    await service.remove(keeper, 1);

    expect(remove).toHaveBeenCalledWith(1);
    expect(await storage.head('maintenance-quotes/a.pdf')).toBeNull();
  });

  // triste
  it('refuses the deletion for someone who only queries the area', async () => {
    const remove = vi.fn();
    const service = makeService({ remove });

    await expect(service.remove(viewer, 1)).rejects.toThrow(ForbiddenException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('answers 404 for a quote that does not exist, without deleting', async () => {
    const remove = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), remove });

    await expect(service.remove(keeper, 99)).rejects.toThrow(NotFoundException);
    expect(remove).not.toHaveBeenCalled();
  });
});
