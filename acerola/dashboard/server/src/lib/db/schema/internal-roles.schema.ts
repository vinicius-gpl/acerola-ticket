import { ROLE_CONTEXTS } from '@template/shared/schemas/user.schema';
import { sql } from 'drizzle-orm';
import { check, index, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

export const USER_ROLES = ['user', 'manager', 'admin'] as const;

/**
 * Cargos internos do sistema, desacoplados do mecanismo de autenticação/entidade.
 *
 * Cada linha associa um identificador estável da entidade (ex.: id ou e-mail) a um cargo
 * dentro de um determinado contexto (área do sistema: 'infra', 'sistema', 'manutencao').
 *
 * Não possui foreign key rígida para `neon_auth.user` de propósito: quando a autenticação
 * migrar para auth-forward ou API própria, a tabela e as permissões continuam intactas
 * sem necessidade de alterar o esquema.
 */
export const internalRoles = pgTable(
  'internal_roles',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').notNull(),
    userEmail: text('user_email'),
    context: text('context', { enum: ROLE_CONTEXTS as unknown as [string, ...string[]] }).notNull().default('sistema'),
    role: text('role', { enum: USER_ROLES as unknown as [string, ...string[]] }).notNull().default('user'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    createdBy: text('created_by'),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    uniqueIndex('internal_roles_user_context_idx').on(table.userId, table.context),
    index('internal_roles_user_id_idx').on(table.userId),
    index('internal_roles_user_email_idx').on(table.userEmail),
    index('internal_roles_context_idx').on(table.context),
    check(
      'internal_roles_context_valid',
      sql`${table.context} in (${sql.raw(ROLE_CONTEXTS.map((c) => `'${c}'`).join(', '))})`,
    ),
    check(
      'internal_roles_role_valid',
      sql`${table.role} in (${sql.raw(USER_ROLES.map((r) => `'${r}'`).join(', '))})`,
    ),
  ],
);

export type InternalRoleRow = typeof internalRoles.$inferSelect;
export type InternalRoleInsert = typeof internalRoles.$inferInsert;
