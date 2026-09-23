import { ForbiddenException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { partListQuerySchema } from '@template/shared/schemas/part.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type DatabaseExecutor } from '../../../lib/db/db.type';
import { type PartMovementRow } from '../../../lib/db/schema/part-movements.schema';
import { type PartRow } from '../../../lib/db/schema/parts.schema';
import {
  type MovementWithRefs,
  type PartsRepository,
} from '../repository/parts.repository';
import { PartsService } from './parts.service';

/** Ana cadastra as peças nestes testes — dona do registro em `partRow()`. */
const owner: RequestUser = { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'user' };

/** Bia tem o mesmo papel, mas não cadastrou nada: separa "meu" de "dos outros". */
const otherUser: RequestUser = { ...owner, id: '2', email: 'bia@empresa.com.br', name: 'Bia' };

const manager: RequestUser = { ...otherUser, id: '3', name: 'Caio', role: 'manager' };

/* Identidade PELA METADE: chegou sem papel. O contrato não admite, e é por isso que o teste
   precisa forçar — a recusa existe justamente para o que não devia chegar. */
const noRole = { ...owner, role: undefined } as unknown as RequestUser;

function partRow(overrides: Partial<PartRow> = {}): PartRow {
  return {
    id: 1,
    name: 'SSD 240 GB Kingston',
    category: 'ssd',
    condition: 'new',
    balance: 4,
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function movementRow(overrides: Partial<PartMovementRow> = {}): PartMovementRow {
  return {
    id: 10,
    partId: 1,
    type: 'out',
    quantity: 1,
    balanceAfter: 3,
    computerId: 3,
    handledBy: 'Suporte TI',
    note: null,
    createdAt: new Date('2026-09-20T12:00:00.000Z'),
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function movementWithRefs(overrides: Partial<PartMovementRow> = {}): MovementWithRefs {
  return {
    movement: movementRow(overrides),
    part: { id: 1, name: 'SSD 240 GB Kingston', condition: 'new' },
    computer: { id: 3, name: 'CONTABIL-03', displayName: 'Contábil', department: 'contabil' },
  };
}

/**
 * O repository fingido. `transaction` só executa o que recebe: a transação de verdade é do
 * banco, e o que este teste precisa provar é a REGRA que roda dentro dela.
 */
function makeService(repository: Partial<PartsRepository>) {
  const withTransaction = {
    transaction: vi.fn(async (run: (executor: DatabaseExecutor) => Promise<unknown>) =>
      run({} as DatabaseExecutor),
    ),
    ...repository,
  };

  return new PartsService(withTransaction as unknown as PartsRepository);
}

const query = (overrides: Record<string, unknown> = {}) => partListQuerySchema.parse(overrides);

describe('PartsService.list', () => {
  // feliz
  it('returns the page translated into the contract', async () => {
    const service = makeService({
      list: vi.fn().mockResolvedValue({ rows: [partRow()], total: 7 }),
    });

    const page = await service.list(owner, query({ page: '1', pageSize: '10' }));

    expect(page.total).toBe(7);
    expect(page.items[0]?.balance).toBe(4);
  });

  // triste
  it('refuses an unidentified request without touching the repository', async () => {
    const list = vi.fn();
    const service = makeService({ list });

    await expect(service.list(noRole, query())).rejects.toBeInstanceOf(ForbiddenException);
    expect(list).not.toHaveBeenCalled();
  });
});

describe('PartsService.create', () => {
  // feliz
  /* O saldo inicial precisa ter uma linha que o explique — senão é um número que ninguém
     consegue conferir depois. */
  it('turns the starting quantity into the first movement of the ledger', async () => {
    const insertMovement = vi.fn().mockResolvedValue(1);
    const update = vi.fn().mockResolvedValue(partRow({ balance: 4 }));
    const service = makeService({
      insert: vi.fn().mockResolvedValue(partRow({ balance: 0 })),
      insertMovement,
      update,
    });

    const created = await service.create(owner, {
      name: 'SSD 240 GB Kingston',
      category: 'ssd',
      condition: 'new',
      initialQuantity: 4,
    });

    expect(insertMovement).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'in', quantity: 4, balanceAfter: 4 }),
      expect.anything(),
    );
    expect(update).toHaveBeenCalledWith(1, { balance: 4 }, expect.anything());
    expect(created.balance).toBe(4);
  });

  it('registers no movement when the shelf starts empty', async () => {
    const insertMovement = vi.fn();
    const service = makeService({
      insert: vi.fn().mockResolvedValue(partRow({ balance: 0 })),
      insertMovement,
    });

    await service.create(owner, { name: 'Mouse', category: 'mouse', condition: 'new' });

    expect(insertMovement).not.toHaveBeenCalled();
  });

  it('stamps the author from the identity, never from the body', async () => {
    const insert = vi.fn().mockResolvedValue(partRow({ balance: 0 }));
    const service = makeService({ insert });

    await service.create(owner, { name: 'Mouse', category: 'mouse', condition: 'new' });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'ana@empresa.com.br', balance: 0 }),
      expect.anything(),
    );
  });

  // triste
  it('refuses an unidentified request without writing', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });

    await expect(
      service.create(noRole, { name: 'Mouse', category: 'mouse', condition: 'new' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('PartsService.createMovement', () => {
  // feliz
  it('moves the balance together with the ledger line', async () => {
    const insertMovement = vi.fn().mockResolvedValue(10);
    const update = vi.fn();
    const service = makeService({
      findByIdForUpdate: vi.fn().mockResolvedValue(partRow({ balance: 4 })),
      insertMovement,
      update,
      findMovementById: vi.fn().mockResolvedValue(movementWithRefs()),
    });

    await service.createMovement(owner, 1, { type: 'out', quantity: 1, computerId: 3 });

    expect(insertMovement).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'out', quantity: 1, balanceAfter: 3, computerId: 3 }),
      expect.anything(),
    );
    expect(update).toHaveBeenCalledWith(1, { balance: 3 }, expect.anything());
  });

  it('adds to the shelf on an entry', async () => {
    const update = vi.fn();
    const service = makeService({
      findByIdForUpdate: vi.fn().mockResolvedValue(partRow({ balance: 4 })),
      insertMovement: vi.fn().mockResolvedValue(11),
      update,
      findMovementById: vi.fn().mockResolvedValue(movementWithRefs({ type: 'in', balanceAfter: 9 })),
    });

    await service.createMovement(owner, 1, { type: 'in', quantity: 5 });

    expect(update).toHaveBeenCalledWith(1, { balance: 9 }, expect.anything());
  });

  it('lets the last one leave, emptying the shelf', async () => {
    const update = vi.fn();
    const service = makeService({
      findByIdForUpdate: vi.fn().mockResolvedValue(partRow({ balance: 2 })),
      insertMovement: vi.fn().mockResolvedValue(12),
      update,
      findMovementById: vi.fn().mockResolvedValue(movementWithRefs({ quantity: 2, balanceAfter: 0 })),
    });

    await service.createMovement(owner, 1, { type: 'out', quantity: 2 });

    expect(update).toHaveBeenCalledWith(1, { balance: 0 }, expect.anything());
  });

  // triste
  /* O sistema antigo prendia o saldo em zero e seguia: tirar 5 de um estoque de 2 deixava
     zero sem avisar, e a diferença só aparecia quando alguém ia buscar a peça. */
  it('refuses to take out more than what is on the shelf, saying how many there are', async () => {
    const insertMovement = vi.fn();
    const update = vi.fn();
    const service = makeService({
      findByIdForUpdate: vi.fn().mockResolvedValue(partRow({ balance: 2 })),
      insertMovement,
      update,
    });

    await expect(
      service.createMovement(owner, 1, { type: 'out', quantity: 5 }),
    ).rejects.toThrow(/Só há 2 de SSD 240 GB Kingston/);
    expect(insertMovement).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });

  it('says the shelf is empty instead of refusing without a reason', async () => {
    const service = makeService({
      findByIdForUpdate: vi.fn().mockResolvedValue(partRow({ balance: 0 })),
      insertMovement: vi.fn(),
    });

    await expect(service.createMovement(owner, 1, { type: 'out', quantity: 1 })).rejects.toThrow(
      /Não há SSD 240 GB Kingston no depósito/,
    );
  });

  it('answers unprocessable, not server error, when the stock does not cover it', async () => {
    const service = makeService({
      findByIdForUpdate: vi.fn().mockResolvedValue(partRow({ balance: 1 })),
      insertMovement: vi.fn(),
    });

    await expect(
      service.createMovement(owner, 1, { type: 'out', quantity: 4 }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('answers not found, without writing, when the part is gone', async () => {
    const insertMovement = vi.fn();
    const service = makeService({
      findByIdForUpdate: vi.fn().mockResolvedValue(null),
      insertMovement,
    });

    await expect(
      service.createMovement(owner, 99, { type: 'in', quantity: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(insertMovement).not.toHaveBeenCalled();
  });
});

describe('PartsService.updateMovement', () => {
  // feliz
  it('fixes who took it, leaving the balance alone', async () => {
    const updateMovement = vi.fn();
    const service = makeService({
      findMovementById: vi.fn().mockResolvedValue(movementWithRefs()),
      updateMovement,
    });

    await service.updateMovement(owner, 10, { handledBy: 'Bia', note: 'Sala 3' });

    expect(updateMovement).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ handledBy: 'Bia', note: 'Sala 3' }),
    );
    expect(updateMovement.mock.calls[0]?.[1]).not.toHaveProperty('quantity');
  });

  // triste
  it('refuses another person movement, without writing anything', async () => {
    const updateMovement = vi.fn();
    const service = makeService({
      findMovementById: vi.fn().mockResolvedValue(movementWithRefs()),
      updateMovement,
    });

    await expect(service.updateMovement(otherUser, 10, { note: 'x' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(updateMovement).not.toHaveBeenCalled();
  });
});

describe('PartsService.removeMovement', () => {
  // feliz
  /* Excluir uma linha do meio do extrato muda o saldo de todas as seguintes: deixá-las como
     estavam mostraria uma sequência que não fecha. */
  it('gives the balance back and rebuilds the ledger of that part', async () => {
    const updateMovement = vi.fn();
    const update = vi.fn();
    const service = makeService({
      findMovementById: vi.fn().mockResolvedValue(movementWithRefs()),
      findByIdForUpdate: vi.fn().mockResolvedValue(partRow()),
      deleteMovement: vi.fn(),
      /* O que sobrou depois da exclusão: uma entrada de 4 e uma saída de 1, com o
         `balanceAfter` ainda contando com a linha que saiu. */
      listMovementsOfPart: vi.fn().mockResolvedValue([
        movementRow({ id: 1, type: 'in', quantity: 4, balanceAfter: 4 }),
        movementRow({ id: 2, type: 'out', quantity: 1, balanceAfter: 2 }),
      ]),
      update,
      updateMovement,
    });

    await service.removeMovement(owner, 10);

    /* A primeira linha já estava certa e não é reescrita; a segunda passa de 2 para 3. */
    expect(updateMovement).toHaveBeenCalledTimes(1);
    expect(updateMovement).toHaveBeenCalledWith(2, { balanceAfter: 3 }, expect.anything());
    expect(update).toHaveBeenCalledWith(1, { balance: 3 }, expect.anything());
  });

  it('empties the balance when the only movement is deleted', async () => {
    const update = vi.fn();
    const service = makeService({
      findMovementById: vi.fn().mockResolvedValue(movementWithRefs()),
      findByIdForUpdate: vi.fn().mockResolvedValue(partRow()),
      deleteMovement: vi.fn(),
      listMovementsOfPart: vi.fn().mockResolvedValue([]),
      update,
      updateMovement: vi.fn(),
    });

    await service.removeMovement(owner, 10);

    expect(update).toHaveBeenCalledWith(1, { balance: 0 }, expect.anything());
  });

  it('lets a manager delete a movement registered by someone else', async () => {
    const deleteMovement = vi.fn();
    const service = makeService({
      findMovementById: vi.fn().mockResolvedValue(movementWithRefs()),
      findByIdForUpdate: vi.fn().mockResolvedValue(partRow()),
      deleteMovement,
      listMovementsOfPart: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      updateMovement: vi.fn(),
    });

    await service.removeMovement(manager, 10);

    expect(deleteMovement).toHaveBeenCalledWith(10, expect.anything());
  });

  // triste
  it('refuses to delete another person movement', async () => {
    const deleteMovement = vi.fn();
    const service = makeService({
      findMovementById: vi.fn().mockResolvedValue(movementWithRefs()),
      deleteMovement,
    });

    await expect(service.removeMovement(otherUser, 10)).rejects.toBeInstanceOf(ForbiddenException);
    expect(deleteMovement).not.toHaveBeenCalled();
  });

  it('answers not found when the movement is already gone', async () => {
    const service = makeService({ findMovementById: vi.fn().mockResolvedValue(null) });

    await expect(service.removeMovement(owner, 99)).rejects.toBeInstanceOf(NotFoundException);
  });
});
