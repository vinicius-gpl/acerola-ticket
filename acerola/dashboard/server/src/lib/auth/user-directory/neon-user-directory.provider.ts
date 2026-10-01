import { Inject, Injectable } from '@nestjs/common';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';
import { asc, eq } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../db/db-error.util';
import { DB } from '../../db/db.token';
import { type Database } from '../../db/db.type';
import { neonAuthUsers, type NeonAuthUserRow } from '../../db/neon-auth-user.table';
import { type UserDirectoryProvider } from './user-directory.interface';

/**
 * Converte a linha lida da tabela externa `neon_auth.user` no tipo limpo `DirectoryUser`.
 */
function toDirectoryUser(row: NeonAuthUserRow): DirectoryUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image ?? null,
    role: row.role ?? null,
    banned: Boolean(row.banned),
    createdAt: row.createdAt ? row.createdAt.toISOString() : null,
  };
}

/**
 * Implementação do provedor de diretório conectada diretamente ao Neon Auth (`neon_auth.user`).
 *
 * Ao migrar para o `auth-forward`, esta classe é substituída por uma que chama a API HTTP
 * do `auth-forward`, sem alterar qualquer ponto do restante da aplicação.
 */
@Injectable()
export class NeonUserDirectoryProvider implements UserDirectoryProvider {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listUsers(): Promise<DirectoryUser[]> {
    const rows = await runQuery(
      this.db.select().from(neonAuthUsers).orderBy(asc(neonAuthUsers.name)),
      'listar usuários do diretório Neon Auth',
    );

    return rows.map(toDirectoryUser);
  }

  async getUserById(id: string): Promise<DirectoryUser | null> {
    const row = await runMaybe(
      this.db.select().from(neonAuthUsers).where(eq(neonAuthUsers.id, id)).limit(1),
      'buscar usuário no diretório Neon Auth',
    );

    return row ? toDirectoryUser(row) : null;
  }
}
