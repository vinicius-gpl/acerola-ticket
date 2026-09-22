import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { taskListQuerySchema } from '@template/shared/schemas/task.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type TaskRow } from '../../../lib/db/schema/tasks.schema';
import { type TasksRepository } from '../repository/tasks.repository';
import { TasksService } from './tasks.service';

/** Ana é quem cria as tarefas nestes testes — dona do registro em `taskRow()`. */
const owner: RequestUser = {
  id: '1',
  email: 'ana@empresa.com.br',
  name: 'Ana',
  role: 'user',
};

/** Bia tem o mesmo papel de Ana, mas não criou nada: é o caso que separa "meu" de "dos outros". */
const otherUser: RequestUser = { ...owner, id: '2', email: 'bia@empresa.com.br', name: 'Bia' };

const manager: RequestUser = { ...otherUser, id: '3', name: 'Caio', role: 'manager' };
const admin: RequestUser = { ...otherUser, id: '4', name: 'Dani', role: 'admin' };

function taskRow(overrides: Partial<TaskRow> = {}): TaskRow {
  return {
    id: 1,
    title: 'Ligar para o cliente',
    description: null,
    status: 'todo',
    createdAt: new Date('2026-09-14T12:00:00.000Z'),
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function makeService(repository: Partial<TasksRepository>) {
  return new TasksService(repository as TasksRepository);
}

const query = (overrides: Record<string, unknown> = {}) => taskListQuerySchema.parse(overrides);

describe('TasksService.list', () => {
  // feliz
  it('returns the page translated into the contract', async () => {
    const service = makeService({
      list: vi.fn().mockResolvedValue({ rows: [taskRow(), taskRow({ id: 2 })], total: 12 }),
    });

    const page = await service.list(owner, query({ page: '2', pageSize: '2' }));

    expect(page).toMatchObject({ total: 12, page: 2, pageSize: 2 });
    expect(page.items[0]?.createdAt).toBe('2026-09-14T12:00:00.000Z');
  });

  it('returns an empty page, not an error, when there is nothing', async () => {
    const service = makeService({ list: vi.fn().mockResolvedValue({ rows: [], total: 0 }) });

    await expect(service.list(owner, query())).resolves.toMatchObject({ items: [], total: 0 });
  });
});

describe('TasksService.create', () => {
  // feliz
  it('stamps the author from the identity', async () => {
    const insert = vi.fn().mockResolvedValue(taskRow());
    const service = makeService({ insert });

    await service.create(owner, { title: 'Nova' });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'ana@empresa.com.br' }),
    );
  });

  // triste
  /* Autoria vem da identidade, nunca do corpo — mandar `createdBy` não muda quem assina. */
  it('ignores an author sent in the body', async () => {
    const insert = vi.fn().mockResolvedValue(taskRow());
    const service = makeService({ insert });

    await service.create(owner, { title: 'Nova', createdBy: 'chefe@empresa.com.br' } as never);

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'ana@empresa.com.br' }),
    );
  });
});

describe('TasksService.update', () => {
  // feliz
  it('saves only what came and returns the saved task', async () => {
    const update = vi.fn().mockResolvedValue(taskRow({ status: 'done' }));
    const service = makeService({ findById: vi.fn().mockResolvedValue(taskRow()), update });

    const task = await service.update(owner, 1, { status: 'done' });

    expect(task.status).toBe('done');
    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'done', updatedBy: 'ana@empresa.com.br' }),
    );
  });

  it('lets a manager change what someone else created', async () => {
    const update = vi.fn().mockResolvedValue(taskRow({ status: 'done' }));
    const service = makeService({ findById: vi.fn().mockResolvedValue(taskRow()), update });

    await service.update(manager, 1, { status: 'done' });

    expect(update).toHaveBeenCalledWith(1, expect.objectContaining({ status: 'done' }));
  });

  // triste
  /* A regra que separa os papéis: tarefa de outra pessoa é intocável para quem é `user`. */
  it('refuses a plain user on a task created by someone else', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(taskRow()), update });

    await expect(service.update(otherUser, 1, { status: 'done' })).rejects.toThrow(
      ForbiddenException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses with 404 when the task does not exist, without writing', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), update });

    await expect(service.update(owner, 999, { status: 'done' })).rejects.toThrow(NotFoundException);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('TasksService.remove', () => {
  // feliz
  it('lets the author delete their own task', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = makeService({ findById: vi.fn().mockResolvedValue(taskRow()), delete: remove });

    await service.remove(owner, 1);

    expect(remove).toHaveBeenCalledWith(1);
  });

  it('lets an admin delete a task from someone else', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = makeService({ findById: vi.fn().mockResolvedValue(taskRow()), delete: remove });

    await service.remove(admin, 1);

    expect(remove).toHaveBeenCalledWith(1);
  });

  // triste
  it('refuses a plain user on a task from someone else, without deleting', async () => {
    const remove = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(taskRow()), delete: remove });

    await expect(service.remove(otherUser, 1)).rejects.toThrow(ForbiddenException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('refuses with 404 when the task does not exist', async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), delete: vi.fn() });

    await expect(service.remove(admin, 999)).rejects.toThrow(NotFoundException);
  });
});

describe('TasksService.findById', () => {
  it('returns the task', async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(taskRow({ id: 5 })) });

    await expect(service.findById(otherUser, 5)).resolves.toMatchObject({ id: 5 });
  });

  // triste
  it('refuses with 404 when it does not exist', async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(null) });

    await expect(service.findById(otherUser, 999)).rejects.toThrow(NotFoundException);
  });
});
