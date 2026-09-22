import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_USER_ROLE,
  sessionUserSchema,
  userRoleSchema,
  type SessionUser,
} from '@template/shared/schemas/user.schema';
import { eq } from 'drizzle-orm';

import { runMaybe } from '../db/db-error.util';
import { DB } from '../db/db.token';
import { type Database } from '../db/db.type';
import { neonAuthUsers, type NeonAuthUserRow } from '../db/schema/neon-auth-user.schema';
import { NEON_TOKEN_VERIFIER } from './neon-token.token';
import { type NeonTokenVerifier } from './neon-token.util';

/**
 * DE ONDE A IDENTIDADE VEM — e só daqui.
 *
 * Duas etapas, nesta ordem, e nenhuma delas é dispensável:
 *
 *  1. **O token prova quem é.** Assinado pela Neon, conferido contra a chave pública dela.
 *  2. **O banco diz o que a pessoa é hoje.** Nome, e-mail, papel e banimento saem de
 *     `neon_auth.user`, nunca do token.
 *
 * A ordem existe por causa do prazo: o token vale 15 minutos. Tirar o papel dele faria uma
 * pessoa rebaixada continuar administradora até o token vencer — e, pior, faria alguém
 * banido continuar entrando. Lendo do banco, a troca no painel da Neon vale na requisição
 * seguinte.
 */
@Injectable()
export class IdentityProvider {
  constructor(
    @Inject(NEON_TOKEN_VERIFIER) private readonly verifyToken: NeonTokenVerifier,
    @Inject(DB) private readonly db: Database,
  ) {}

  /**
   * Resolve quem está na requisição. `null` significa "não sei quem é você" — e quem chamou
   * transforma isso em 401.
   *
   * Todos os motivos de recusa devolvem o mesmo `null` de propósito: token inválido, conta
   * apagada e conta banida são indistinguíveis para quem está do outro lado.
   */
  async resolve(token: string): Promise<SessionUser | null> {
    const claims = await this.verifyToken(token);
    if (!claims) return null;

    const row = await runMaybe(
      this.db.select().from(neonAuthUsers).where(eq(neonAuthUsers.id, claims.userId)).limit(1),
      'ler a pessoa no cadastro do Neon Auth',
    );
    if (!row) return null;
    if (isBanned(row)) return null;

    return toSessionUser(row, claims.email);
  }
}

/**
 * Banimento com prazo continua sendo banimento até a data passar. Sem a comparação de data,
 * "banido por 7 dias" viraria "banido para sempre".
 */
function isBanned(row: NeonAuthUserRow): boolean {
  if (!row.banned) return false;
  if (!row.banExpires) return true;

  return row.banExpires.getTime() > Date.now();
}

/**
 * A linha do cadastro vira identidade.
 *
 * O papel passa pelo schema: valor que não é um dos três do sistema (vazio numa conta nova,
 * ou um papel escrito à mão no painel) vira `user`, o mais restrito. Adivinhar para cima
 * seria dar acesso que ninguém concedeu.
 */
function toSessionUser(row: NeonAuthUserRow, emailFromToken: string | null): SessionUser | null {
  const role = userRoleSchema.safeParse(row.role);

  const parsed = sessionUserSchema.safeParse({
    id: row.id,
    email: row.email || emailFromToken,
    name: row.name,
    role: role.success ? role.data : DEFAULT_USER_ROLE,
  });

  return parsed.success ? parsed.data : null;
}
