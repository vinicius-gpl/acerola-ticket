import { TASK_STATUSES } from '@template/shared/domain/task-status.util';
import { sql } from 'drizzle-orm';
import { check, index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Tarefas — a tabela da feature de EXEMPLO. Uma tabela por arquivo: `<nome>.schema.ts`.
 *
 * Mudou esta estrutura? Rode `npm run db:generate`: o `drizzle-kit` compara com a última
 * migration e escreve a próxima em `server/drizzle/`. A migration é versionada; o arquivo do
 * banco, não.
 *
 * Datas são `integer` em milissegundos: o SQLite não tem tipo de data, e texto ISO ordenado
 * por string quebra quando alguém grava sem fuso. O Drizzle devolve `Date` dos dois jeitos.
 */
export const tasks = sqliteTable(
  'tasks',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: TASK_STATUSES }).notNull().default('todo'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(cast(unixepoch('subsec') * 1000 as integer))`),
    /* Quem criou, carimbado no servidor com o e-mail da identidade. Nunca do corpo. */
    createdBy: text('created_by').notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('tasks_status_idx').on(table.status),
    index('tasks_created_at_idx').on(table.createdAt),
    /* O `enum` do Drizzle só existe no TypeScript. Esta checagem é o que faz o BANCO recusar
       um status inventado — inclusive o que chegar por um seed ou pelo Drizzle Studio. */
    check(
      'tasks_status_valid',
      sql`${table.status} in (${sql.raw(TASK_STATUSES.map((status) => `'${status}'`).join(', '))})`,
    ),
  ],
);

export type TaskRow = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;
