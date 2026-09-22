import { type SessionUser } from '@template/shared/schemas/user.schema';

import { type UserRow } from '../../../lib/db/schema/users.schema';

/**
 * A linha do banco tem `passwordHash`; `SessionUser` nunca pode ter. Passar a linha inteira
 * adiante "por enquanto, só pra facilitar" é como um hash de senha vaza pra um log de erro.
 */
export function toSessionUser(row: UserRow): SessionUser {
  return { id: String(row.id), email: row.email, name: row.name, role: row.role };
}
