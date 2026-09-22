import { sql } from 'drizzle-orm';

import { hashPassword } from '../../../server/src/lib/auth/password.util';
import { type Database } from '../../../server/src/lib/db/db.type';
import { users } from '../../../server/src/lib/db/schema/users.schema';
import { openSeedDatabase, report } from '../seed.util';
import { USERS_SEED } from './users.data';

/**
 * Grava a conta de desenvolvimento.
 *
 * A senha é hasheada AQUI, a cada execução — não dá para gravar o hash direto em
 * `users.data.ts` porque `scrypt` gera um salt novo toda vez, e o `onConflictDoUpdate`
 * precisa do hash de verdade para o login continuar funcionando com a mesma senha documentada.
 */
export async function seedUsers(db: Database): Promise<number> {
  const rows = await Promise.all(
    USERS_SEED.map(async (input) => ({
      id: input.id,
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    })),
  );

  await db
    .insert(users)
    .values(rows)
    .onConflictDoUpdate({
      target: users.id,
      set: {
        email: sql`excluded.email`,
        name: sql`excluded.name`,
        role: sql`excluded.role`,
        passwordHash: sql`excluded.password_hash`,
      },
    });

  return rows.length;
}

/* Rodando sozinho (`npm run seed:users`), abre o banco e grava só esta entidade. */
if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('usuários', await seedUsers(db));
    } finally {
      await close();
    }
  });
}
