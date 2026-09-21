import { TASK_STATUSES } from '@template/shared/domain/task-status.util';
import { sql } from 'drizzle-orm';
import { check, index, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * Tarefas — a tabela da feature de EXEMPLO. Uma tabela por arquivo: `<nome>.schema.ts`.
 *
 * Mudou esta estrutura? Rode `npm run db:generate`: o `drizzle-kit` compara com a última
 * migration e escreve a próxima em `server/drizzle/`. A migration é versionada.
 *
 * Datas são `timestamptz`: o Postgres guarda o instante em UTC e converte na leitura, então
 * a mesma linha lida de fusos diferentes continua sendo o mesmo momento. É o que o SQLite
 * não tinha — lá a data era um inteiro em milissegundos, justamente por falta de tipo.
 */
export const tasks = pgTable(
  'tasks',
  {
    id: serial('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status', { enum: TASK_STATUSES }).notNull().default('todo'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    /* Quem criou, carimbado no servidor com o e-mail da identidade. Nunca do corpo. */
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
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
