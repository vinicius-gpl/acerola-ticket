import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { maintenanceListQuerySchema } from '@template/shared/schemas/maintenance.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type MaintenanceRow } from '../../../lib/db/schema/maintenances.schema';
import {
  type MaintenancesRepository,
  type MaintenanceWithComputer,
  type PreventiveRow,
} from '../repository/maintenances.repository';
import { MaintenancesService } from './maintenances.service';

/** Ana registra as manutenções nestes testes — dona do registro em `row()`. */
const owner: RequestUser = { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'user' };

/** Bia tem o mesmo papel, mas não registrou nada: separa "meu" de "dos outros". */
const otherUser: RequestUser = { ...owner, id: '2', email: 'bia@empresa.com.br', name: 'Bia' };

const manager: RequestUser = { ...otherUser, id: '3', name: 'Caio', role: 'manager' };

/* Identidade PELA METADE: chegou sem papel definido. O contrato não admite isso, e é por
   isso que o teste precisa forçar — a recusa existe justamente para o que não devia chegar. */
const noRole = { ...owner, role: undefined } as unknown as RequestUser;

function maintenanceRow(overrides: Partial<MaintenanceRow> = {}): MaintenanceRow {
  return {
    id: 1,
    computerId: 3,
    otherMachine: null,
    type: 'preventive',
    description: 'Limpeza interna e pasta térmica',
    performedBy: 'Suporte TI',
    performedAt: new Date('2026-09-20T12:00:00.000Z'),
    createdAt: new Date('2026-09-20T13:00:00.000Z'),
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function row(overrides: Partial<MaintenanceRow> = {}): MaintenanceWithComputer {
  return {
    maintenance: maintenanceRow(overrides),
    computer: { id: 3, name: 'CONTABIL-03', displayName: 'Contábil — fechamento', department: 'contabil' },
  };
}

function makeService(repository: Partial<MaintenancesRepository>) {
  return new MaintenancesService(repository as MaintenancesRepository);
}

const query = (overrides: Record<string, unknown> = {}) =>
  maintenanceListQuerySchema.parse(overrides);

const NOW = '2026-09-23T12:00:00.000Z';

function preventiveRow(overrides: Partial<PreventiveRow> = {}): PreventiveRow {
  return {
    computerId: 1,
    computerName: 'RECEPCAO-01',
    computerDisplayName: 'Recepção',
    computerDepartment: 'recepcao',
    lastDoneAt: new Date('2026-09-01T12:00:00.000Z'),
    maintenanceCount: 1,
    ...overrides,
  };
}

describe('MaintenancesService.list', () => {
  // feliz
  it('returns the page translated into the contract, with the machine name from the inventory', async () => {
    const service = makeService({
      list: vi.fn().mockResolvedValue({ rows: [row()], total: 12 }),
    });

    const page = await service.list(owner, query({ page: '2', pageSize: '2' }));

    expect(page).toMatchObject({ total: 12, page: 2, pageSize: 2 });
    expect(page.items[0]?.computerName).toBe('CONTABIL-03');
    expect(page.items[0]?.performedAt).toBe('2026-09-20T12:00:00.000Z');
  });

  it('returns an empty page, not an error, when there is nothing', async () => {
    const service = makeService({ list: vi.fn().mockResolvedValue({ rows: [], total: 0 }) });

    await expect(service.list(owner, query())).resolves.toMatchObject({ items: [], total: 0 });
  });

  // triste
  it('refuses a profile that cannot read, without touching the repository', async () => {
    const list = vi.fn();
    const service = makeService({ list });

    await expect(service.list(noRole, query())).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(list).not.toHaveBeenCalled();
  });
});

describe('MaintenancesService.create', () => {
  // feliz
  it('stamps the author from the identity, never from the body', async () => {
    const insert = vi.fn().mockResolvedValue(1);
    const service = makeService({ insert, findById: vi.fn().mockResolvedValue(row()) });

    await service.create(owner, { computerId: 3, type: 'preventive', performedAt: NOW });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'ana@empresa.com.br' }),
    );
  });

  /* Equipamento de fora do inventário: o notebook velho da recepção. */
  it('accepts equipment named by hand, with no machine linked', async () => {
    const insert = vi.fn().mockResolvedValue(2);
    const service = makeService({
      insert,
      findById: vi.fn().mockResolvedValue({
        maintenance: maintenanceRow({ id: 2, computerId: null, otherMachine: 'Impressora' }),
        computer: null,
      }),
    });

    const created = await service.create(owner, {
      otherMachine: 'Impressora',
      type: 'corrective',
      performedAt: NOW,
    });

    expect(created.otherMachine).toBe('Impressora');
    expect(created.computerName).toBeNull();
  });

  // triste
  it('refuses a profile that cannot create, without touching the repository', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });

    await expect(
      service.create(noRole, { computerId: 3, type: 'preventive', performedAt: NOW }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('MaintenancesService.update', () => {
  // feliz
  it('lets the person who registered it fix what was typed wrong', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(row()), update });

    await service.update(owner, 1, { description: 'Troquei o SSD' });

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({ description: 'Troquei o SSD' }));
  });

  it('lets a manager fix a record registered by someone else', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(row()), update });

    await service.update(manager, 1, { description: 'Corrigido' });

    expect(update).toHaveBeenCalled();
  });

  // triste
  /* Registro de outra pessoa não se mexe: o histórico é a prova do que foi feito, e quem
     fez precisa se reconhecer nele. */
  it('refuses another person record, without writing anything', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(row()), update });

    await expect(service.update(otherUser, 1, { description: 'x' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('answers not found, without writing, when the record is gone', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), update });

    await expect(service.update(owner, 99, { description: 'x' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });
});

describe('MaintenancesService.remove', () => {
  // feliz
  it('deletes the record of whoever registered it', async () => {
    const remove = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(row()), delete: remove });

    await service.remove(owner, 1);

    expect(remove).toHaveBeenCalledWith(1);
  });

  // triste
  it('refuses to delete another person record', async () => {
    const remove = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(row()), delete: remove });

    await expect(service.remove(otherUser, 1)).rejects.toBeInstanceOf(ForbiddenException);
    expect(remove).not.toHaveBeenCalled();
  });
});

describe('MaintenancesService.preventive', () => {
  // feliz
  it('puts the overdue machines first, oldest one at the top', async () => {
    const service = makeService({
      listPreventive: vi.fn().mockResolvedValue([
        preventiveRow({ computerId: 1, computerName: 'RECEPCAO-01' }),
        preventiveRow({
          computerId: 2,
          computerName: 'FINANCEIRO-02',
          lastDoneAt: new Date('2026-01-10T12:00:00.000Z'),
        }),
        preventiveRow({
          computerId: 3,
          computerName: 'CONTABIL-03',
          lastDoneAt: new Date('2026-05-10T12:00:00.000Z'),
        }),
      ]),
    });

    const rows = await service.preventive(owner);

    expect(rows.map((item) => item.computerName)).toEqual([
      'FINANCEIRO-02',
      'CONTABIL-03',
      'RECEPCAO-01',
    ]);
    expect(rows[0]?.status).toBe('due');
    expect(rows[2]?.status).toBe('ok');
  });

  /* "Nunca feita" é diferente de "vencida": uma máquina cadastrada ontem não é atraso do time. */
  it('tells a machine never serviced apart from an overdue one', async () => {
    const service = makeService({
      listPreventive: vi
        .fn()
        .mockResolvedValue([preventiveRow({ lastDoneAt: null, maintenanceCount: 0 })]),
    });

    const [first] = await service.preventive(owner);

    expect(first?.status).toBe('never');
    expect(first?.lastDoneAt).toBeNull();
  });

  // triste
  it('refuses a profile that cannot read, without touching the repository', async () => {
    const listPreventive = vi.fn();
    const service = makeService({ listPreventive });

    await expect(service.preventive(noRole)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(listPreventive).not.toHaveBeenCalled();
  });
});
