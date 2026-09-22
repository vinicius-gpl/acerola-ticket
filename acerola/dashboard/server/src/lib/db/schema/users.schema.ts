import { userRoleSchema } from '@template/shared/schemas/user.schema';
import { sql } from 'drizzle-orm';
import { check, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * As contas do login próprio. Uma tabela por arquivo, igual a `tasks.schema.ts`.
 *
 * `passwordHash` nunca é a senha — é `salt:hash` do `scrypt` (ver `lib/auth/password.util.ts`).
 * Ela não tem schema Zod irmão em `shared/`: não é um formulário que a tela preenche, e nunca
 * deveria sair da API — nem em erro, nem em log.
 */
export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    name: text('name').notNull(),
    role: text('role', { enum: userRoleSchema.options }).notNull().default('viewer'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    /* O `enum` do Drizzle só existe no TypeScript. Esta checagem faz o BANCO recusar um papel
       inventado — inclusive o que chegar por um seed ou pelo Drizzle Studio. */
    check(
      'users_role_valid',
      sql`${table.role} in (${sql.raw(userRoleSchema.options.map((role) => `'${role}'`).join(', '))})`,
    ),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type UserInsert = typeof users.$inferInsert;
