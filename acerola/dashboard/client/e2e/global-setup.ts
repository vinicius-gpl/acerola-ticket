import { sql } from 'drizzle-orm';

import { hashPassword } from '../../server/src/lib/auth/password.util';
import { openDatabase } from '../../server/src/lib/db/open-database.util';
import { users } from '../../server/src/lib/db/schema/users.schema';

export const E2E_USER = { email: 'e2e-web@template.local', password: 'e2e-web-teste-123' };

/**
 * Roda UMA vez, antes de todos os testes do Playwright: garante uma conta de verdade no banco
 * de teste (`TEST_DATABASE_URL`), porque `/tasks` agora exige login.
 *
 * Não usa o seed padrão (`npm run seed:all`) de propósito: aquele grava a conta de
 * desenvolvimento no banco de TRABALHO. Este é outro banco, outra conta, e só para o E2E.
 */
export default async function globalSetup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return; // sem TEST_DATABASE_URL, playwright.config.ts nem passa DATABASE_URL adiante.

  const { db, close } = await openDatabase(url);
  try {
    await db.execute(sql`truncate table tasks, users, sessions restart identity cascade`);
    await db.insert(users).values({
      email: E2E_USER.email,
      name: 'E2E Web',
      role: 'admin',
      passwordHash: await hashPassword(E2E_USER.password),
    });
  } finally {
    await close();
  }
}
