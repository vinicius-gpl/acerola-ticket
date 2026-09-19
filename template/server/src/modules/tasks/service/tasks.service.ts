import { Injectable, NotFoundException } from '@nestjs/common';
import { type Paginated } from '@template/shared/schemas/pagination.schema';
import {
  type CreateTaskInput,
  type Task,
  type TaskListQuery,
  type UpdateTaskInput,
} from '@template/shared/schemas/task.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  assertCanDelete,
  assertCanEdit,
  assertCanRead,
} from '../../../lib/policy/policy-assert.util';
import { toTask, toTaskInsert, toTaskUpdate } from '../mapper/tasks.mapper';
import { TasksRepository } from '../repository/tasks.repository';

const NOT_FOUND = 'Tarefa não encontrada. Ela pode ter sido excluída — recarregue a lista.';

/**
 * O ÚNICO caminho de escrita de tarefa. Controller não fala com repository, e o repository
 * não decide nada.
 *
 * A policy é chamada AQUI, colada na escrita, e não num passo separado: esquecer de chamar a
 * policy é uma porta aberta, e ela fica mais difícil de esquecer no mesmo lugar do `insert`.
 */
@Injectable()
export class TasksService {
  constructor(private readonly repository: TasksRepository) {}

  async list(user: RequestUser, query: TaskListQuery): Promise<Paginated<Task>> {
    assertCanRead(user.role, 'as tarefas');

    const page = await this.repository.list(query);

    return {
      items: page.rows.map(toTask),
      total: page.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async findById(user: RequestUser, id: number): Promise<Task> {
    assertCanRead(user.role, 'as tarefas');

    const row = await this.repository.findById(id);
    if (!row) throw new NotFoundException(NOT_FOUND);

    return toTask(row);
  }

  async create(user: RequestUser, input: CreateTaskInput): Promise<Task> {
    assertCanEdit(user.role, 'as tarefas');

    const row = await this.repository.insert(toTaskInsert(input, user.email));

    return toTask(row);
  }

  async update(user: RequestUser, id: number, input: UpdateTaskInput): Promise<Task> {
    assertCanEdit(user.role, 'as tarefas');

    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException(NOT_FOUND);

    const row = await this.repository.update(id, toTaskUpdate(input, user.email));

    return toTask(row);
  }

  async remove(user: RequestUser, id: number): Promise<void> {
    assertCanDelete(user.role, 'tarefas');

    const current = await this.repository.findById(id);
    if (!current) throw new NotFoundException(NOT_FOUND);

    await this.repository.delete(id);
  }
}
