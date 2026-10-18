import { Inject, Injectable } from '@nestjs/common';
import { type DirectoryUser } from '@template/shared/schemas/user.schema';
import { asc, eq, ilike, or } from 'drizzle-orm';

import { runMaybe, runQuery } from '../db/db-error.util';
import { DB } from '../db/db.token';
import { type Database } from '../db/db.type';
import { neonAuthUsers, type NeonAuthUserRow } from '../db/neon-auth-user.table';
import { type UserDirectoryProvider } from './user-directory.type';

/**
 * Converte a linha lida da tabela externa `neon_auth.user` no tipo limpo `DirectoryUser`.
 */
/* Busca por um primeiro nome comum ("Ana") traz bastante gente; o desempate é de quem chama. */
const SEARCH_LIMIT = 50;

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

  async searchUsers(term: string): Promise<DirectoryUser[]> {
    const pattern = `%${escapeLike(term.trim())}%`;
    const rows = await runQuery(
      this.db
        .select()
        .from(neonAuthUsers)
        .where(or(ilike(neonAuthUsers.name, pattern), ilike(neonAuthUsers.email, pattern)))
        .orderBy(asc(neonAuthUsers.name))
        .limit(SEARCH_LIMIT),
      'procurar pessoas no diretório Neon Auth',
    );

    return rows.map(toDirectoryUser);
  }
}

/* `%` e `_` são curingas no LIKE: escritos pela pessoa, valem como letra. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (char) => `\\${char}`);
}
