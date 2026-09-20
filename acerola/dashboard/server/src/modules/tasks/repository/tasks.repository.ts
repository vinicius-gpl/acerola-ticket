import { Inject, Injectable } from '@nestjs/common';
import { type TaskListQuery } from '@template/shared/schemas/task.schema';
import { and, count, desc, eq, like, or, type SQL } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { tasks, type TaskInsert, type TaskRow } from '../../../lib/db/schema/tasks.schema';

export type TaskPage = {
  rows: TaskRow[];
  total: number;
};

/**
 * O repository não tem regra: ele traduz filtro em consulta e devolve linha. Toda decisão —
 * quem pode, o que carimbar, o que fazer quando não existe — vive no service.
 *
 * Toda consulta passa por `runQuery`/`runMaybe`: é o que faz a recusa do banco chegar à tela
 * com status e motivo, em vez de "erro inesperado".
 */
@Injectable()
export class TasksRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: TaskListQuery): Promise<TaskPage> {
    const where = buildWhere(query);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(tasks)
          .where(where)
          .orderBy(desc(tasks.createdAt), desc(tasks.id))
          .limit(query.pageSize)
          .offset(offset),
        'listar tarefas',
      ),
      runQuery(this.db.select({ total: count() }).from(tasks).where(where), 'contar tarefas'),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async findById(id: number): Promise<TaskRow | null> {
    return runMaybe(this.db.select().from(tasks).where(eq(tasks.id, id)).limit(1), 'ler tarefa');
  }

  async insert(values: TaskInsert): Promise<TaskRow> {
    const [row] = await runQuery(
      this.db.insert(tasks).values(values).returning(),
      'cadastrar tarefa',
    );

    return row as TaskRow;
  }

  async update(id: number, values: Partial<TaskInsert>): Promise<TaskRow> {
    const [row] = await runQuery(
      this.db.update(tasks).set(values).where(eq(tasks.id, id)).returning(),
      'salvar tarefa',
    );

    return row as TaskRow;
  }

  async delete(id: number): Promise<void> {
    await runQuery(this.db.delete(tasks).where(eq(tasks.id, id)), 'excluir tarefa');
  }
}

/**
 * `like` no SQLite já ignora maiúscula e minúscula para letras sem acento. "Revisão" e
 * "revisao" continuam diferentes — busca sem acento é trabalho para quando alguém pedir.
 */
function buildWhere(query: TaskListQuery): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (query.status) filters.push(eq(tasks.status, query.status));

  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(or(like(tasks.title, term), like(tasks.description, term)));
  }

  return filters.length > 0 ? and(...filters) : undefined;
}
