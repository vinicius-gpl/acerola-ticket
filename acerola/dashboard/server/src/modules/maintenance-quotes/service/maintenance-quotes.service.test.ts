import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { maintenanceQuoteListQuerySchema } from '@template/shared/schemas/maintenance-quote.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type MaintenanceQuoteRow } from '../../../lib/db/schema/maintenance-quotes.schema';
import { type StorageService } from '../../../lib/storage/storage.service';
import { type MaintenanceQuotesRepository } from '../repository/maintenance-quotes.repository';
import { MaintenanceQuotesService, type UploadedAttachment } from './maintenance-quotes.service';

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

function attachment(overrides: Partial<UploadedAttachment> = {}): UploadedAttachment {
  return {
    originalname: 'orcamento.pdf',
    mimetype: 'application/pdf',
    size: 2048,
    buffer: Buffer.from('nao-e-um-pdf-de-verdade'),
    ...overrides,
  };
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

const defaultStorage: Partial<StorageService> = {
  upload: vi.fn().mockResolvedValue({
    key: 'maintenance-quotes/novo.pdf',
    contentType: 'application/pdf',
    sizeBytes: 10,
  }),
  createDownloadUrl: vi.fn().mockResolvedValue('https://r2.exemplo/doc?assinatura'),
  remove: vi.fn().mockResolvedValue(undefined),
};

function makeService(
  repository: Partial<MaintenanceQuotesRepository> = {},
  storage: Partial<StorageService> = {},
) {
  return new MaintenanceQuotesService(
    { ...defaultRepository, ...repository } as MaintenanceQuotesRepository,
    { ...defaultStorage, ...storage } as StorageService,
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
      { createDownloadUrl: vi.fn().mockRejectedValue(new Error('r2 fora do ar')) },
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

  it('stores the document and keeps its key and its name', async () => {
    const insert = vi.fn().mockResolvedValue(row());
    const service = makeService({ insert });

    await service.create(keeper, input, attachment());

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        attachmentKey: 'maintenance-quotes/novo.pdf',
        attachmentName: 'orcamento.pdf',
      }),
    );
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

  it('refuses a file that is not an accepted document, without storing anything', async () => {
    const upload = vi.fn();
    const insert = vi.fn();
    const service = makeService({ insert }, { upload });

    await expect(
      service.create(keeper, input, attachment({ mimetype: 'application/zip' })),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(upload).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('MaintenanceQuotesService.update', () => {
  // feliz
  it('changes the quote and drops the document that was replaced', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(row({ attachmentKey: 'maintenance-quotes/velho.pdf' })),
        update: vi.fn().mockResolvedValue(row({ attachmentKey: 'maintenance-quotes/novo.pdf' })),
      },
      { remove },
    );

    await service.update(keeper, 1, {}, attachment());

    expect(remove).toHaveBeenCalledWith('maintenance-quotes/velho.pdf');
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
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(row({ attachmentKey: 'maintenance-quotes/velho.pdf' })),
        update: vi.fn().mockResolvedValue(row({ attachmentKey: 'maintenance-quotes/novo.pdf' })),
      },
      { remove: vi.fn().mockRejectedValue(new Error('r2 fora do ar')) },
    );

    await expect(service.update(keeper, 1, {}, attachment())).resolves.toBeTruthy();
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
    const storageRemove = vi.fn().mockResolvedValue(undefined);
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(row({ attachmentKey: 'maintenance-quotes/a.pdf' })),
        remove,
      },
      { remove: storageRemove },
    );

    await service.remove(keeper, 1);

    expect(remove).toHaveBeenCalledWith(1);
    expect(storageRemove).toHaveBeenCalledWith('maintenance-quotes/a.pdf');
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
