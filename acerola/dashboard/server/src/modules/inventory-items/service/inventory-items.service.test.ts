import {
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { inventoryItemListQuerySchema } from '@template/shared/schemas/inventory-item.schema';
import { inventoryMovementListQuerySchema } from '@template/shared/schemas/inventory-movement.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type InventoryItemRow } from '../../../lib/db/schema/inventory-items.schema';
import { type InventoryMovementRow } from '../../../lib/db/schema/inventory-movements.schema';
import { type FileStorage } from '../../../lib/storage/file-storage.type';
import { MemoryStorage } from '../../../lib/storage/memory-storage';
import { StagedUploadsService } from '../../../lib/storage/staged-uploads.service';
import { type InventoryItemsRepository } from '../repository/inventory-items.repository';
import { optimizePhoto } from './inventory-photo.util';
import { InventoryItemsService } from './inventory-items.service';

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
    balance: 4,
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

const PHOTO_KEY = 'tmp/00000000-0000-4000-8000-000000000001.jpg';

/** O que o navegador faz com o link: põe a foto na área temporária. Devolve o que vai no corpo. */
async function sentPhoto(
  storage: MemoryStorage,
  file: { contentType: string; sizeBytes: number } = { contentType: 'image/jpeg', sizeBytes: 2048 },
) {
  await storage.put(PHOTO_KEY, Buffer.alloc(file.sizeBytes), file.contentType);

  return { storageKey: PHOTO_KEY, fileName: 'cadeira.jpg' };
}

function movementRow(overrides: Partial<InventoryMovementRow> = {}): InventoryMovementRow {
  return {
    id: 10,
    itemId: 1,
    type: 'out',
    quantity: 1,
    balanceAfter: 3,
    reason: null,
    note: null,
    createdAt: new Date('2026-09-02T12:00:00.000Z'),
    createdBy: 'ana@empresa.com.br',
    ...overrides,
  };
}

const defaultRepository: Partial<InventoryItemsRepository> = {
  list: vi.fn().mockResolvedValue({ rows: [row()], total: 1 }),
  findById: vi.fn().mockResolvedValue(row()),
  insert: vi.fn().mockResolvedValue(row()),
  update: vi.fn().mockResolvedValue(row()),
  remove: vi.fn().mockResolvedValue(undefined),
  findByIdForUpdate: vi.fn().mockResolvedValue(row()),
  updateBalance: vi.fn().mockResolvedValue(undefined),
  insertMovement: vi.fn().mockImplementation(async (values) => movementRow(values)),
  listMovements: vi.fn().mockResolvedValue({
    rows: [{ movement: movementRow(), item: { name: 'Cadeira de escritório', unit: 'unit' } }],
    total: 1,
  }),
  /* A transação de mentira só roda o que recebeu: o que importa aqui é a ORDEM das decisões
     do service, não o banco. */
  transaction: vi.fn().mockImplementation(async (run) => run({})),
};

const defaultStorage: Partial<FileStorage> = {
  downloadUrl: vi.fn().mockResolvedValue('https://r2.exemplo/foto?assinatura'),
};

/**
 * O storage é o de memória, de verdade — com o que o teste quiser trocar por cima (uma falha,
 * um espião). Passar um `MemoryStorage` pronto deixa o teste olhar o que ficou nele.
 */
function makeService(
  repository: Partial<InventoryItemsRepository> = {},
  storage: Partial<FileStorage> = {},
) {
  const memory = Object.assign(
    storage instanceof MemoryStorage ? storage : new MemoryStorage(),
    defaultStorage,
    storage instanceof MemoryStorage ? {} : storage,
  );

  return new InventoryItemsService(
    { ...defaultRepository, ...repository } as InventoryItemsRepository,
    new StagedUploadsService(memory),
    memory,
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
      { downloadUrl: vi.fn().mockRejectedValue(new Error('r2 fora do ar')) },
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

  it('shrinks the photo that was sent and keeps the key of the final file', async () => {
    const insert = vi.fn().mockResolvedValue(row());
    const storage = new MemoryStorage();
    const service = makeService({ insert }, storage);

    await service.create(keeper, {
      name: 'Bebedouro',
      category: 'appliance',
      unit: 'unit',
      photo: await sentPhoto(storage),
    });

    const key = insert.mock.calls[0]?.[0].photoKey as string;
    expect(key).toMatch(/^inventory\/[0-9a-f-]{36}\.webp$/);
    expect((await storage.get(key))?.content.toString()).toBe('webp-de-mentira');
    /* A foto original sai da área temporária: o que fica é a versão encolhida. */
    expect(await storage.head(PHOTO_KEY)).toBeNull();
  });

  /* Sem o ffmpeg, vai o original: perder o cadastro por uma conversão seria pior. */
  it('keeps the original photo when it cannot be shrunk', async () => {
    vi.mocked(optimizePhoto).mockResolvedValueOnce(null);
    const insert = vi.fn().mockResolvedValue(row());
    const storage = new MemoryStorage();
    const service = makeService({ insert }, storage);

    await service.create(keeper, {
      name: 'Bebedouro',
      category: 'appliance',
      unit: 'unit',
      photo: await sentPhoto(storage),
    });

    expect(insert.mock.calls[0]?.[0].photoKey).toMatch(/^inventory\/[0-9a-f-]{36}\.jpg$/);
  });

  // feliz
  it('hands the photo upload link to whoever manages the area', async () => {
    const service = makeService();

    const ticket = await service.createPhotoUploadTicket(keeper, {
      fileName: 'cadeira.jpg',
      contentType: 'image/jpeg',
      sizeBytes: 2048,
    });

    expect(ticket.storageKey).toMatch(/^tmp\/[0-9a-f-]{36}\.jpg$/);
  });

  // triste
  it('gives no upload link to someone who only queries the area', async () => {
    const service = makeService();

    await expect(
      service.createPhotoUploadTicket(viewer, {
        fileName: 'cadeira.jpg',
        contentType: 'image/jpeg',
        sizeBytes: 2048,
      }),
    ).rejects.toThrow(ForbiddenException);
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

  it('refuses a file that is not an accepted image, and clears it from the staging area', async () => {
    const insert = vi.fn();
    const storage = new MemoryStorage();
    const service = makeService({ insert }, storage);
    const photo = await sentPhoto(storage, { contentType: 'application/pdf', sizeBytes: 2048 });

    await expect(
      service.create(keeper, { name: 'Mesa', category: 'furniture', unit: 'unit', photo }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(insert).not.toHaveBeenCalled();
    expect(storage.size).toBe(0);
  });

  /* A tela declarou uma foto pequena; o link aceita o que for enviado. Vale o medido. */
  it('refuses a photo that turned out bigger than the ceiling', async () => {
    const insert = vi.fn();
    const storage = new MemoryStorage();
    const service = makeService({ insert }, storage);
    const photo = await sentPhoto(storage, {
      contentType: 'image/jpeg',
      sizeBytes: 13 * 1024 * 1024,
    });

    await expect(
      service.create(keeper, { name: 'Mesa', category: 'furniture', unit: 'unit', photo }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(insert).not.toHaveBeenCalled();
  });

  it('refuses a photo that never reached the storage', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });
    const photo = { storageKey: PHOTO_KEY, fileName: 'cadeira.jpg' };

    await expect(
      service.create(keeper, { name: 'Mesa', category: 'furniture', unit: 'unit', photo }),
    ).rejects.toThrow(NotFoundException);
    expect(insert).not.toHaveBeenCalled();
  });

  it('lets a storage outage through when checking the photo', async () => {
    const service = makeService(
      {},
      { head: vi.fn().mockRejectedValue(new TypeError('fetch failed')) },
    );
    const photo = { storageKey: PHOTO_KEY, fileName: 'cadeira.jpg' };

    await expect(
      service.create(keeper, { name: 'Mesa', category: 'furniture', unit: 'unit', photo }),
    ).rejects.toThrow('fetch failed');
  });
});

describe('InventoryItemsService.update', () => {
  // feliz
  it('changes the product and drops the photo that was replaced', async () => {
    const storage = new MemoryStorage();
    await storage.put('inventory/antiga.webp', Buffer.from('a'), 'image/webp');
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(row({ photoKey: 'inventory/antiga.webp' })),
        update: vi.fn().mockResolvedValue(row({ photoKey: 'inventory/nova.webp' })),
      },
      storage,
    );

    await service.update(keeper, 1, { photo: await sentPhoto(storage) });

    expect(await storage.head('inventory/antiga.webp')).toBeNull();
  });

  /* O arquivo órfão custa centavos; devolver erro a quem só trocou a foto custa confiança. */
  it('does not fail the change when the old photo cannot be deleted', async () => {
    const storage = Object.assign(new MemoryStorage(), {
      remove: vi.fn().mockRejectedValue(new Error('r2 fora do ar')),
    });
    const service = makeService(
      {
        findById: vi.fn().mockResolvedValue(row({ photoKey: 'inventory/antiga.webp' })),
        update: vi.fn().mockResolvedValue(row({ photoKey: 'inventory/nova.webp' })),
      },
      storage,
    );

    await expect(
      service.update(keeper, 1, { photo: await sentPhoto(storage) }),
    ).resolves.toBeTruthy();
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
    const storage = new MemoryStorage();
    await storage.put('inventory/a.webp', Buffer.from('a'), 'image/webp');
    const service = makeService(
      { findById: vi.fn().mockResolvedValue(row({ photoKey: 'inventory/a.webp' })), remove },
      storage,
    );

    await service.remove(keeper, 1);

    expect(remove).toHaveBeenCalledWith(1);
    expect(await storage.head('inventory/a.webp')).toBeNull();
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

describe('InventoryItemsService.movements', () => {
  // feliz
  it('lists the statement with the name of each product', async () => {
    const page = await makeService().movements(
      viewer,
      inventoryMovementListQuerySchema.parse({ type: 'out' }),
    );

    expect(page.total).toBe(1);
    expect(page.items[0]).toMatchObject({ itemName: 'Cadeira de escritório', balanceAfter: 3 });
  });

  // triste
  it('refuses an unidentified request without touching the repository', async () => {
    const listMovements = vi.fn();
    const service = makeService({ listMovements });

    await expect(
      service.movements(noRole, inventoryMovementListQuerySchema.parse({})),
    ).rejects.toThrow(ForbiddenException);
    expect(listMovements).not.toHaveBeenCalled();
  });
});

describe('InventoryItemsService.createMovement', () => {
  // feliz
  it('registers an entry and moves the balance with it', async () => {
    const insertMovement = vi.fn().mockImplementation(async (values) => movementRow(values));
    const updateBalance = vi.fn().mockResolvedValue(undefined);
    const service = makeService({ insertMovement, updateBalance });

    const movement = await service.createMovement(keeper, 1, { type: 'in', quantity: 6 });

    expect(insertMovement).toHaveBeenCalledWith(
      expect.objectContaining({ itemId: 1, type: 'in', quantity: 6, balanceAfter: 10 }),
      expect.anything(),
    );
    expect(updateBalance).toHaveBeenCalledWith(1, 10, expect.anything());
    expect(movement).toMatchObject({ itemName: 'Cadeira de escritório', balanceAfter: 10 });
  });

  it('registers a disposal with its reason, stamping who did it', async () => {
    const insertMovement = vi.fn().mockImplementation(async (values) => movementRow(values));
    const service = makeService({ insertMovement });

    await service.createMovement(keeper, 1, { type: 'disposal', quantity: 4, reason: 'broken' });

    expect(insertMovement).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'disposal',
        reason: 'broken',
        balanceAfter: 0,
        createdBy: 'ana@empresa.com.br',
      }),
      expect.anything(),
    );
  });

  /* O motivo é do descarte: junto com uma saída comum, ele é ruído — e não é gravado. */
  it('drops a reason sent along with a movement that is not a disposal', async () => {
    const insertMovement = vi.fn().mockImplementation(async (values) => movementRow(values));
    const service = makeService({ insertMovement });

    await service.createMovement(keeper, 1, { type: 'out', quantity: 1, reason: 'broken' });

    expect(insertMovement).toHaveBeenCalledWith(
      expect.objectContaining({ reason: null }),
      expect.anything(),
    );
  });

  // triste
  /* O saldo não fica negativo: a recusa diz quanto há, para a pessoa saber o que conferir. */
  it('refuses taking out more than exists, saying how much there is', async () => {
    const insertMovement = vi.fn();
    const updateBalance = vi.fn();
    const service = makeService({ insertMovement, updateBalance });

    await expect(service.createMovement(keeper, 1, { type: 'out', quantity: 9 })).rejects.toThrow(
      'Só há 4 de Cadeira de escritório no depósito',
    );
    expect(insertMovement).not.toHaveBeenCalled();
    expect(updateBalance).not.toHaveBeenCalled();
  });

  it('refuses a disposal of a product with nothing in stock', async () => {
    const service = makeService({
      findByIdForUpdate: vi.fn().mockResolvedValue(row({ balance: 0 })),
    });

    await expect(
      service.createMovement(keeper, 1, { type: 'disposal', quantity: 1, reason: 'lost' }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('answers 404 for a product that does not exist, without writing', async () => {
    const insertMovement = vi.fn();
    const service = makeService({
      findByIdForUpdate: vi.fn().mockResolvedValue(null),
      insertMovement,
    });

    await expect(service.createMovement(keeper, 99, { type: 'in', quantity: 1 })).rejects.toThrow(
      NotFoundException,
    );
    expect(insertMovement).not.toHaveBeenCalled();
  });

  /* ESCALADA DE PRIVILÉGIO: cargo de consulta não mexe no depósito, nem abre transação. */
  it('refuses the movement for someone who only queries the area', async () => {
    const transaction = vi.fn();
    const service = makeService({ transaction });

    await expect(service.createMovement(viewer, 1, { type: 'in', quantity: 1 })).rejects.toThrow(
      ForbiddenException,
    );
    await expect(
      service.createMovement(infraManager, 1, { type: 'in', quantity: 1 }),
    ).rejects.toThrow(ForbiddenException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
