import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { inventoryItemListQuerySchema } from '@template/shared/schemas/inventory-item.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type InventoryItemRow } from '../../../lib/db/schema/inventory-items.schema';
import { type StorageService } from '../../../lib/storage/storage.service';
import { type InventoryItemsRepository } from '../repository/inventory-items.repository';
import { InventoryItemsService, type UploadedPhoto } from './inventory-items.service';

/* O ffmpeg é um PROCESSO de fora: deixá-lo rodar aqui tornaria o teste do service dependente
   de um programa instalado na máquina, e lento. O que ele faz tem teste próprio
   (`inventory-photo.util.test.ts`); aqui só importa o que o service faz com a resposta. */
vi.mock('./inventory-photo.util', () => ({
  optimizePhoto: vi.fn().mockResolvedValue({
    content: Buffer.from('webp-de-mentira'),
    contentType: 'image/webp',
  }),
}));

/* Quem cuida da Manutenção: cargo de GESTÃO na área, que é o que deixa mexer no inventário. */
const keeper: RequestUser = {
  id: '1',
  email: 'ana@empresa.com.br',
  name: 'Ana',
  role: 'user',
  roles: { infra: 'user', sistema: 'user', manutencao: 'manager' },
};

/* Mesmo papel geral, cargo de CONSULTA na Manutenção: vê o inventário, não mexe nele. */
const viewer: RequestUser = {
  ...keeper,
  id: '2',
  email: 'bia@empresa.com.br',
  name: 'Bia',
  roles: { infra: 'user', sistema: 'user', manutencao: 'user' },
};

/* Gestor de OUTRA área: manda na dele, não na cadeira do escritório (#13). */
const infraManager: RequestUser = {
  ...keeper,
  id: '3',
  email: 'caio@empresa.com.br',
  name: 'Caio',
  roles: { infra: 'admin', sistema: 'user', manutencao: 'user' },
};

/* Identidade PELA METADE: chegou sem papel. O contrato não admite, e a recusa existe
   justamente para o que não devia chegar. */
const noRole = { ...keeper, role: undefined, roles: undefined } as unknown as RequestUser;

function row(overrides: Partial<InventoryItemRow> = {}): InventoryItemRow {
  return {
    id: 1,
    name: 'Cadeira de escritório',
    category: 'furniture',
    unit: 'unit',
    location: 'Sala da contabilidade',
    code: 'PAT-0042',
    note: null,
    photoKey: null,
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function photo(overrides: Partial<UploadedPhoto> = {}): UploadedPhoto {
  return {
    originalname: 'cadeira.jpg',
    mimetype: 'image/jpeg',
    size: 2048,
    buffer: Buffer.from('nao-e-uma-imagem-de-verdade'),
    ...overrides,
  };
}

const defaultRepository: Partial<InventoryItemsRepository> = {
  list: vi.fn().mockResolvedValue({ rows: [row()], total: 1 }),
  findById: vi.fn().mockResolvedValue(row()),
  insert: vi.fn().mockResolvedValue(row()),
  update: vi.fn().mockResolvedValue(row()),
  remove: vi.fn().mockResolvedValue(undefined),
};

const defaultStorage: Partial<StorageService> = {
  upload: vi.fn().mockResolvedValue({
    key: 'inventory/nova.webp',
    contentType: 'image/webp',
    sizeBytes: 10,
  }),
  createDownloadUrl: vi.fn().mockResolvedValue('https://r2.exemplo/foto?assinatura'),
  remove: vi.fn().mockResolvedValue(undefined),
};

function makeService(
  repository: Partial<InventoryItemsRepository> = {},
  storage: Partial<StorageService> = {},
) {
  return new InventoryItemsService(
    { ...defaultRepository, ...repository } as InventoryItemsRepository,
    { ...defaultStorage, ...storage } as StorageService,
  );
}

const query = inventoryItemListQuerySchema.parse({});

describe('InventoryItemsService.list', () => {
  // feliz
  it('lists the products with the temporary link of each photo', async () => {
    const service = makeService({
      list: vi.fn().mockResolvedValue({ rows: [row({ photoKey: 'inventory/a.webp' })], total: 1 }),
    });

    const page = await service.list(viewer, query);

    expect(page.total).toBe(1);
    expect(page.items[0]?.photoUrl).toBe('https://r2.exemplo/foto?assinatura');
  });

  /* Falha no storage não pode derrubar a lista: o produto aparece sem imagem. */
  it('still lists the products when the photo link cannot be created', async () => {
    const service = makeService(
      {
        list: vi
          .fn()
          .mockResolvedValue({ rows: [row({ photoKey: 'inventory/a.webp' })], total: 1 }),
      },
      { createDownloadUrl: vi.fn().mockRejectedValue(new Error('r2 fora do ar')) },
    );

    const page = await service.list(viewer, query);

    expect(page.items[0]?.photoUrl).toBeNull();
  });

  // triste
  it('refuses an unidentified request without touching the repository', async () => {
    const list = vi.fn();
    const service = makeService({ list });

    await expect(service.list(noRole, query)).rejects.toThrow(ForbiddenException);
    expect(list).not.toHaveBeenCalled();
  });
});

describe('InventoryItemsService.create', () => {
  // feliz
  it('registers the product stamping the authorship from the identity', async () => {
    const insert = vi.fn().mockResolvedValue(row());
    const service = makeService({ insert });

    await service.create(keeper, { name: 'Café em pó', category: 'pantry', unit: 'package' });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Café em pó', createdBy: 'ana@empresa.com.br' }),
    );
  });

  it('stores the photo and keeps the key of the stored file', async () => {
    const insert = vi.fn().mockResolvedValue(row());
    const service = makeService({ insert });

    await service.create(
      keeper,
      { name: 'Bebedouro', category: 'appliance', unit: 'unit' },
      photo(),
    );

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ photoKey: 'inventory/nova.webp' }),
    );
  });

  // triste
  /* ESCALADA DE PRIVILÉGIO: cargo de consulta na área não cadastra (CONTRIBUTING §7). */
  it('refuses to register for someone who only queries the area', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });

    await expect(
      service.create(viewer, { name: 'Café', category: 'pantry', unit: 'package' }),
    ).rejects.toThrow(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });

  /* ESCALADA DE PRIVILÉGIO: mandar em OUTRA área não dá acesso a esta. */
  it('refuses a manager of another area', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });

    await expect(
      service.create(infraManager, { name: 'Café', category: 'pantry', unit: 'package' }),
    ).rejects.toThrow(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses a file that is not an accepted image, without storing anything', async () => {
    const upload = vi.fn();
    const insert = vi.fn();
    const service = makeService({ insert }, { upload });

    await expect(
      service.create(
        keeper,
        { name: 'Mesa', category: 'furniture', unit: 'unit' },
        photo({ mimetype: 'application/pdf' }),
      ),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(upload).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('InventoryItemsService.update', () => {
  // feliz
  it('changes the product and drops the photo that was replaced', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(row({ photoKey: 'inventory/antiga.webp' })),
        update: vi.fn().mockResolvedValue(row({ photoKey: 'inventory/nova.webp' })),
      },
      { remove },
    );

    await service.update(keeper, 1, {}, photo());

    expect(remove).toHaveBeenCalledWith('inventory/antiga.webp');
  });

  /* O arquivo órfão custa centavos; devolver erro a quem só trocou a foto custa confiança. */
  it('does not fail the change when the old photo cannot be deleted', async () => {
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(row({ photoKey: 'inventory/antiga.webp' })),
        update: vi.fn().mockResolvedValue(row({ photoKey: 'inventory/nova.webp' })),
      },
      { remove: vi.fn().mockRejectedValue(new Error('r2 fora do ar')) },
    );

    await expect(service.update(keeper, 1, {}, photo())).resolves.toBeTruthy();
  });

  // triste
  it('answers 404 for a product that does not exist, without writing', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), update });

    await expect(service.update(keeper, 99, { name: 'Outro' })).rejects.toThrow(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses the change for someone who only queries the area', async () => {
    const update = vi.fn();
    const service = makeService({ update });

    await expect(service.update(viewer, 1, { name: 'Outro' })).rejects.toThrow(ForbiddenException);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('InventoryItemsService.remove', () => {
  // feliz
  it('deletes the product and its photo', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const storageRemove = vi.fn().mockResolvedValue(undefined);
    const service = makeService(
      { findById: vi.fn().mockResolvedValue(row({ photoKey: 'inventory/a.webp' })), remove },
      { remove: storageRemove },
    );

    await service.remove(keeper, 1);

    expect(remove).toHaveBeenCalledWith(1);
    expect(storageRemove).toHaveBeenCalledWith('inventory/a.webp');
  });

  // triste
  it('refuses the deletion for someone who only queries the area', async () => {
    const remove = vi.fn();
    const service = makeService({ remove });

    await expect(service.remove(viewer, 1)).rejects.toThrow(ForbiddenException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('answers 404 for a product that does not exist, without deleting', async () => {
    const remove = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), remove });

    await expect(service.remove(keeper, 99)).rejects.toThrow(NotFoundException);
    expect(remove).not.toHaveBeenCalled();
  });
});
