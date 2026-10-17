import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_USER_ROLE,
  roleContextSchema,
  sessionUserSchema,
  userRoleSchema,
  type ContextRoles,
  type SessionUser,
  type UserRole,
} from '@template/shared/schemas/user.schema';
import { eq } from 'drizzle-orm';

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

    const row = await this.findUserRow(claims.userId, claims.email);
    if (!row || isBanned(row)) return null;

    const email = row.email || claims.email;
    const roleRows = await this.fetchInternalRoles(row.id);

    return toSessionUser(row, email, roleRows);
  }

  private async findUserRow(
    userId: string,
    email?: string | null,
  ): Promise<NeonAuthUserRow | null> {
    const row = await runMaybe(
      this.db.select().from(neonAuthUsers).where(eq(neonAuthUsers.id, userId)).limit(1),
      'ler a pessoa no cadastro do Neon Auth',
    );
    if (row || !email) return row;

    return runMaybe(
      this.db.select().from(neonAuthUsers).where(eq(neonAuthUsers.email, email)).limit(1),
      'ler a pessoa no cadastro do Neon Auth por e-mail',
    );
  }

  /**
   * Os módulos liberados para a pessoa — SÓ pelo id da conta no Neon Auth.
   *
   * O e-mail não entra na conta: trocar de e-mail não pode tirar o acesso de ninguém, e um
   * e-mail antigo passado para outra pessoa não pode levar junto os módulos de quem o usava.
   * `user_email` fica na linha só para a tela de Acessos mostrar de quem ela é.
   */
  private async fetchInternalRoles(userId: string): Promise<InternalRoleRow[]> {
    return runQuery(
      this.db.select().from(internalRoles).where(eq(internalRoles.userId, userId)),
      'consultar os módulos da pessoa',
    );
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
 * Os módulos da pessoa, com o nível de cada um — SÓ os que têm linha em `internal_roles`.
 *
 * Módulo sem linha é SEM ACESSO (ver `domain/module-access.util.ts`). O super-admin é a
 * exceção: tem todos, como Administrador.
 */
function resolveContextRoles(roleRows: InternalRoleRow[], isSuper: boolean): ContextRoles {
  if (isSuper) return { infra: 'admin', sistema: 'admin', manutencao: 'admin' };

  const contextRoles: ContextRoles = {};
  for (const r of roleRows) {
    const parsedRole = userRoleSchema.safeParse(r.role);
    const parsedContext = roleContextSchema.safeParse(r.context);
    if (parsedRole.success && parsedContext.success) {
      contextRoles[parsedContext.data] = parsedRole.data;
    }
  }

  return contextRoles;
}

function resolveSafeName(name: string | null | undefined, email: string | null): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  if (email) {
    const handle = email.split('@')[0];
    if (handle) return handle.trim();
  }
  return 'Usuário';
}

/**
 * O PAPEL PRINCIPAL: o maior nível que a pessoa tem em algum módulo — `user` quando não tem
 * nenhum. É o que as rotas que não são de um módulo só (chamados, perfil) enxergam; dentro de
 * um módulo, o `RolesGuard` troca este papel pelo nível DAQUELE módulo.
 */
const LEVEL_ORDER: UserRole[] = ['user', 'manager', 'admin'];

function resolvePrimaryRole(isSuper: boolean, contextRoles: ContextRoles): UserRole {
  if (isSuper) return 'superadmin';

  const levels = Object.values(contextRoles).map((role) => LEVEL_ORDER.indexOf(role));

  return LEVEL_ORDER[Math.max(-1, ...levels)] ?? DEFAULT_USER_ROLE;
}

/**
 * A linha do cadastro combinada com os cargos internos vira identidade completa.
 */
function toSessionUser(
  row: NeonAuthUserRow,
  email: string | null,
  roleRows: InternalRoleRow[],
): SessionUser | null {
  const parsedNeonRole = userRoleSchema.safeParse(row.role);
  const isSuper = parsedNeonRole.success && parsedNeonRole.data === 'superadmin';
  const contextRoles = resolveContextRoles(roleRows, isSuper);
  const primaryRole = resolvePrimaryRole(isSuper, contextRoles);
  const safeName = resolveSafeName(row.name, email);

  const parsed = sessionUserSchema.safeParse({
    id: row.id,
    email,
    name: safeName,
    image: row.image,
    role: primaryRole,
    roles: contextRoles,
  });

  return parsed.success ? parsed.data : null;
}
