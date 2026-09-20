import {
  type CreateTaskInput,
  type Task,
  type UpdateTaskInput,
} from '@template/shared/schemas/task.schema';

import { mapDefined, setIfDefined } from '../../../lib/db/partial-update.util';
import { type TaskInsert, type TaskRow } from '../../../lib/db/schema/tasks.schema';

/**
 * A tradução entre a linha do banco e o contrato. Mora aqui, e não espalhada, porque é aqui
 * que se decide o formato de data que TODA tela recebe.
 */
export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    /* O contrato publica data como texto ISO; o Drizzle devolve `Date`. Converter em cada
       tela faria cada uma inventar o próprio formato. */
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedBy: row.updatedBy,
  };
}

/**
 * `createdBy` é carimbado aqui, com quem veio da identidade — nunca com o que chegou no corpo
 * da requisição.
 */
export function toTaskInsert(input: CreateTaskInput, actorEmail: string): TaskInsert {
  return {
    title: input.title.trim(),
    description: normalizeDescription(input.description) ?? null,
    status: input.status ?? 'todo',
    createdBy: actorEmail,
  };
}

/**
 * Edição parcial: só entra no `update` o que veio. `updatedBy` e `updatedAt` são SEMPRE
 * recarimbados — mesmo que o corpo tente mandar outro valor.
 */
export function toTaskUpdate(input: UpdateTaskInput, actorEmail: string): Partial<TaskInsert> {
  const update: Partial<TaskInsert> = { updatedAt: new Date(), updatedBy: actorEmail };

  setIfDefined(update, 'title', input.title?.trim());
  setIfDefined(update, 'description', normalizeDescription(input.description));
  setIfDefined(update, 'status', input.status);

  return update;
}

/** Descrição só com espaço vira nulo: "" e nulo significando a mesma coisa confunde a busca. */
function normalizeDescription(value: string | null | undefined): string | null | undefined {
  return mapDefined(value, (text) => text.trim() || null);
}
