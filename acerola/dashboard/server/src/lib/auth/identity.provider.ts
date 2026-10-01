import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_USER_ROLE,
  roleContextSchema,
  sessionUserSchema,
  userRoleSchema,
  type ContextRoles,
  type SessionUser,
} from '@template/shared/schemas/user.schema';
import { eq, or } from 'drizzle-orm';

import { runMaybe, runQuery } from '../db/db-error.util';
import { DB } from '../db/db.token';
import { type Database } from '../db/db.type';
import { neonAuthUsers, type NeonAuthUserRow } from '../db/neon-auth-user.table';
import { internalRoles, type InternalRoleRow } from '../db/schema/internal-roles.schema';
import { NEON_TOKEN_VERIFIER } from './neon-token.token';
import { type NeonTokenVerifier } from './neon-token.util';

/**
 * DE ONDE A IDENTIDADE VEM — e só daqui.
 *
 * Duas etapas, nesta ordem:
 *
 *  1. **O token prova quem é.** Assinado pela autenticação externa, conferido contra a chave pública.
 *  2. **O banco diz o que a pessoa é hoje.** Nome, e-mail e banimento saem do provedor
 *     (hoje `neon_auth.user`, amanhã auth-forward), e os CARGOS INTERNOS saem da tabela
 *     `internal_roles` deste sistema.
 *
 * Desacoplamento de identidade e cargo:
 *  - Identidade: externa (quem é).
 *  - Cargo: interno a este sistema, separado por contexto ('infra', 'sistema', 'manutencao').
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

    const email = row.email || claims.email;

    const conditions = [eq(internalRoles.userId, claims.userId)];
    if (email) {
      conditions.push(eq(internalRoles.userEmail, email));
      conditions.push(eq(internalRoles.userId, email));
    }
    const whereClause = conditions.length === 1 ? conditions[0] : or(...conditions);

    const roleRows = await runQuery(
      this.db.select().from(internalRoles).where(whereClause),
      'consultar cargos internos da pessoa',
    );

    return toSessionUser(row, email, roleRows);
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
 * A linha do cadastro combinada com os cargos internos vira identidade completa.
 *
 * Se não houver registro na tabela de cargos internos:
 *  1. Verifica se a conta já possuía papel legado em `neon_auth.user` (migração suave);
 *  2. Caso contrário, cai em `user` (mais restrito) para todos os contextos.
 */
function resolveContextRoles(
  row: NeonAuthUserRow,
  roleRows: InternalRoleRow[],
  isSuper: boolean,
  parsedNeonRole: ReturnType<typeof userRoleSchema.safeParse>,
): ContextRoles {
  if (roleRows.length === 0 && row.role) {
    if (isSuper) {
      return { infra: 'admin', sistema: 'admin', manutencao: 'admin' };
    }
    if (parsedNeonRole.success) {
      return {
        infra: DEFAULT_USER_ROLE,
        sistema: parsedNeonRole.data,
        manutencao: DEFAULT_USER_ROLE,
      };
    }
  }

  const contextRoles: ContextRoles = {
    infra: DEFAULT_USER_ROLE,
    sistema: DEFAULT_USER_ROLE,
    manutencao: DEFAULT_USER_ROLE,
  };

  for (const r of roleRows) {
    const parsedRole = userRoleSchema.safeParse(r.role);
    const parsedContext = roleContextSchema.safeParse(r.context);
    if (parsedRole.success && parsedContext.success) {
      contextRoles[parsedContext.data] = parsedRole.data;
    }
  }

  return contextRoles;
}

/**
 * A linha do cadastro combinada com os cargos internos vira identidade completa.
 *
 * Se não houver registro na tabela de cargos internos:
 *  1. Verifica se a conta já possuía papel legado em `neon_auth.user` (migração suave);
 *  2. Caso contrário, cai em `user` (mais restrito) para todos os contextos.
 */
function toSessionUser(
  row: NeonAuthUserRow,
  email: string | null,
  roleRows: InternalRoleRow[],
): SessionUser | null {
  const parsedNeonRole = userRoleSchema.safeParse(row.role);
  const isSuper = parsedNeonRole.success && parsedNeonRole.data === 'superadmin';
  const contextRoles = resolveContextRoles(row, roleRows, isSuper, parsedNeonRole);
  const primaryRole = isSuper ? 'superadmin' : (contextRoles.sistema ?? DEFAULT_USER_ROLE);

  const parsed = sessionUserSchema.safeParse({
    id: row.id,
    email,
    name: row.name,
    image: row.image,
    role: primaryRole,
    roles: contextRoles,
  });

  return parsed.success ? parsed.data : null;
}
