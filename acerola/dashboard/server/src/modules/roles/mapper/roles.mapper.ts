import {
  type AssignRoleInput,
  type InternalRole,
} from '@template/shared/schemas/internal-role.schema';
import { type RoleContext, type UserRole } from '@template/shared/schemas/user.schema';

import { type InternalRoleInsert, type InternalRoleRow } from '../../../lib/db/schema/internal-roles.schema';

/**
 * Tradução entre a linha do banco `internal_roles` e o contrato `@template/shared`.
 */
export function toInternalRole(row: InternalRoleRow): InternalRole {
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.userEmail ?? null,
    context: row.context as RoleContext,
    role: row.role as UserRole,
    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedBy: row.updatedBy ?? null,
  };
}

/**
 * Prepara o insert ou update de cargo interno.
 * O autor `createdBy` e `updatedBy` vem SEMPRE da identidade autenticada, nunca do corpo.
 */
export function toInternalRoleInsert(
  input: AssignRoleInput,
  actorEmail: string,
): InternalRoleInsert {
  return {
    userId: input.userId.trim(),
    userEmail: input.userEmail?.trim() || null,
    context: input.context,
    role: input.role,
    createdBy: actorEmail,
    updatedBy: actorEmail,
  };
}
