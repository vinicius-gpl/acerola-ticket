import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { taskListQuerySchema } from '@template/shared/schemas/task.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type TaskRow } from '../../../lib/db/schema/tasks.schema';
import { type TasksRepository } from '../repository/tasks.repository';
import { TasksService } from './tasks.service';

const editor: RequestUser = {
  id: '1',
  email: 'ana@empresa.com.br',
  name: 'Ana',
  role: 'editor',
};

const viewer: RequestUser = { ...editor, id: '2', email: 'bia@empresa.com.br', role: 'viewer' };

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

    const page = await service.list(viewer, query({ page: '2', pageSize: '2' }));

    expect(page).toMatchObject({ total: 12, page: 2, pageSize: 2 });
    expect(page.items[0]?.createdAt).toBe('2026-09-14T12:00:00.000Z');
  });

  it('returns an empty page, not an error, when there is nothing', async () => {
    const service = makeService({ list: vi.fn().mockResolvedValue({ rows: [], total: 0 }) });

    await expect(service.list(viewer, query())).resolves.toMatchObject({ items: [], total: 0 });
  });
});

describe('TasksService.create', () => {
  // feliz
  it('stamps the author from the identity', async () => {
    const insert = vi.fn().mockResolvedValue(taskRow());
    const service = makeService({ insert });

    await service.create(editor, { title: 'Nova' });

    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ createdBy: 'ana@empresa.com.br' }),
    );
  });

  // triste
  /* Escalada de privilégio: somente leitura não escreve, e o repository nem é chamado. */
  it('refuses a viewer with 403 before touching the database', async () => {
    const insert = vi.fn();
    const service = makeService({ insert });

    await expect(service.create(viewer, { title: 'Nova' })).rejects.toThrow(ForbiddenException);
    expect(insert).not.toHaveBeenCalled();
  });
});

describe('TasksService.update', () => {
  // feliz
  it('saves only what came and returns the saved task', async () => {
    const update = vi.fn().mockResolvedValue(taskRow({ status: 'done' }));
    const service = makeService({ findById: vi.fn().mockResolvedValue(taskRow()), update });

    const task = await service.update(editor, 1, { status: 'done' });

    expect(task.status).toBe('done');
    expect(update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ status: 'done', updatedBy: 'ana@empresa.com.br' }),
    );
  });

  // triste
  it('refuses with 404 when the task does not exist, without writing', async () => {
    const update = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), update });

    await expect(service.update(editor, 999, { status: 'done' })).rejects.toThrow(
      NotFoundException,
    );
    expect(update).not.toHaveBeenCalled();
  });

  it('refuses a viewer before even looking for the task', async () => {
    const findById = vi.fn();
    const service = makeService({ findById });

    await expect(service.update(viewer, 1, { status: 'done' })).rejects.toThrow(ForbiddenException);
    expect(findById).not.toHaveBeenCalled();
  });
});

describe('TasksService.remove', () => {
  // feliz
  it('lets an admin delete', async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const service = makeService({ findById: vi.fn().mockResolvedValue(taskRow()), delete: remove });

    await service.remove({ ...editor, role: 'admin' }, 1);

    expect(remove).toHaveBeenCalledWith(1);
  });

  // triste
  it('keeps deleting as an admin decision, even for an editor', async () => {
    const remove = vi.fn();
    const service = makeService({ findById: vi.fn().mockResolvedValue(taskRow()), delete: remove });

    await expect(service.remove(editor, 1)).rejects.toThrow(ForbiddenException);
    expect(remove).not.toHaveBeenCalled();
  });

  it('refuses with 404 when the task does not exist', async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(null), delete: vi.fn() });

    await expect(service.remove({ ...editor, role: 'admin' }, 999)).rejects.toThrow(
      NotFoundException,
    );
  });
});

describe('TasksService.findById', () => {
  it('returns the task', async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(taskRow({ id: 5 })) });

    await expect(service.findById(viewer, 5)).resolves.toMatchObject({ id: 5 });
  });

  // triste
  it('refuses with 404 when it does not exist', async () => {
    const service = makeService({ findById: vi.fn().mockResolvedValue(null) });

    await expect(service.findById(viewer, 999)).rejects.toThrow(NotFoundException);
  });
});
