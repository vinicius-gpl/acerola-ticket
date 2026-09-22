import { index, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

/**
 * As sessões do login próprio. Uma linha por sessão aberta — não um token assinado.
 *
 * `id` É o valor do cookie: um texto opaco e aleatório (`lib/auth/session-token.util.ts`),
 * nunca previsível. Guardar a sessão numa tabela (em vez de um JWT autocontido) é o que torna
 * o logout de verdade — apagar a linha — e não só "a pessoa apagou o cookie dela".
 *
 * `on delete cascade`: apagar a conta apaga as sessões dela junto, sem deixar sessão órfã
 * apontando para um usuário que não existe mais.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export type SessionRow = typeof sessions.$inferSelect;
export type SessionInsert = typeof sessions.$inferInsert;
