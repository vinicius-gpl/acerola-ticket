import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { sessions, type SessionInsert } from '../../../lib/db/schema/sessions.schema';
import { users, type UserRow } from '../../../lib/db/schema/users.schema';

/**
 * O repository não tem regra: traduz filtro em consulta. Quem decide se a senha bate, se a
 * conta existe ou o que fazer com a sessão é o `AuthService`.
 */
@Injectable()
export class AuthRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findUserByEmail(email: string): Promise<UserRow | null> {
    return runMaybe(
      this.db.select().from(users).where(eq(users.email, email)).limit(1),
      'ler usuário',
    );
  }

  async createSession(values: SessionInsert): Promise<void> {
    await runQuery(this.db.insert(sessions).values(values), 'abrir sessão');
  }

  async deleteSession(id: string): Promise<void> {
    await runQuery(this.db.delete(sessions).where(eq(sessions.id, id)), 'encerrar sessão');
  }
}
