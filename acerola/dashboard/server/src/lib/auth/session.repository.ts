import { Inject, Injectable } from '@nestjs/common';
import { type SessionUser } from '@template/shared/schemas/user.schema';
import { and, eq, gt } from 'drizzle-orm';

import { runMaybe } from '../db/db-error.util';
import { DB } from '../db/db.token';
import { type Database } from '../db/db.type';
import { sessions } from '../db/schema/sessions.schema';
import { users } from '../db/schema/users.schema';

/**
 * Traduz um token de cookie na identidade de quem está logado — só isso.
 *
 * Fica em `lib/auth`, e não em `modules/auth`, porque o `AuthenticationMiddleware` roda em
 * TODA requisição, antes de qualquer módulo de feature: ele não pode depender de um módulo
 * que só é montado depois dele.
 */
@Injectable()
export class SessionRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** `null` para token ausente, inválido OU expirado — os três tratados como "sem sessão". */
  async findIdentityByToken(token: string): Promise<SessionUser | null> {
    const row = await runMaybe(
      this.db
        .select({
          userId: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
        })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.id, token), gt(sessions.expiresAt, new Date())))
        .limit(1),
      'ler sessão',
    );
    if (!row) return null;

    return { id: String(row.userId), email: row.email, name: row.name, role: row.role };
  }
}
