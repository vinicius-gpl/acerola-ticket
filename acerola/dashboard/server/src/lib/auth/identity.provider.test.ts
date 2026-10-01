import { describe, expect, it, vi } from 'vitest';

import { type Database } from '../db/db.type';
import { neonAuthUsers, type NeonAuthUserRow } from '../db/neon-auth-user.table';
import { internalRoles, type InternalRoleRow } from '../db/schema/internal-roles.schema';
import { IdentityProvider } from './identity.provider';
import { type NeonTokenClaims, type NeonTokenVerifier } from './neon-token.util';

const CLAIMS: NeonTokenClaims = {
  userId: 'neon-user-1',
  email: 'ana@empresa.com.br',
  name: 'Ana do token',
};

function userRow(overrides: Partial<NeonAuthUserRow> = {}): NeonAuthUserRow {
  return {
    id: 'neon-user-1',
    name: 'Ana',
    email: 'ana@empresa.com.br',
    emailVerified: true,
    image: null,
    createdAt: new Date('2026-09-01T12:00:00.000Z'),
    updatedAt: null,
    role: null,
    banned: false,
    banReason: null,
    banExpires: null,
    ...overrides,
  };
}

function internalRoleRow(overrides: Partial<InternalRoleRow> = {}): InternalRoleRow {
  return {
    id: 1,
    userId: 'neon-user-1',
    userEmail: 'ana@empresa.com.br',
    context: 'sistema',
    role: 'manager',
    createdAt: new Date('2026-10-01T12:00:00Z'),
    createdBy: 'admin@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

/** Finge o Drizzle para consultas a `neonAuthUsers` e `internalRoles`. */
function fakeDatabase(userRows: NeonAuthUserRow[], roleRows: InternalRoleRow[] = []): Database {
  const from = vi.fn((table) => {
    if (table === neonAuthUsers) {
      const limit = vi.fn().mockResolvedValue(userRows);
      const where = vi.fn(() => ({ limit }));
      return { where };
    }

    if (table === internalRoles) {
      const where = vi.fn().mockResolvedValue(roleRows);
      return { where };
    }

    return { where: vi.fn(() => ({ limit: vi.fn().mockResolvedValue([]) })) };
  });

  return { select: vi.fn(() => ({ from })) } as unknown as Database;
}

function makeProvider(
  userRows: NeonAuthUserRow[],
  roleRows: InternalRoleRow[] = [],
  claims: NeonTokenClaims | null = CLAIMS,
) {
  const verify: NeonTokenVerifier = vi.fn().mockResolvedValue(claims);

  return { provider: new IdentityProvider(verify, fakeDatabase(userRows, roleRows)), verify };
}

describe('IdentityProvider.resolve', () => {
  // feliz
  it('builds identity with internal roles per context (infra=user, sistema=admin, manutencao=manager)', async () => {
    const roles: InternalRoleRow[] = [
      internalRoleRow({ id: 1, context: 'infra', role: 'user' }),
      internalRoleRow({ id: 2, context: 'sistema', role: 'admin' }),
      internalRoleRow({ id: 3, context: 'manutencao', role: 'manager' }),
    ];
    const { provider } = makeProvider([userRow({ name: 'Ana Maria' })], roles);

    await expect(provider.resolve('token')).resolves.toEqual({
      id: 'neon-user-1',
      email: 'ana@empresa.com.br',
      name: 'Ana Maria',
      image: null,
      role: 'admin',
      roles: {
        infra: 'user',
        sistema: 'admin',
        manutencao: 'manager',
      },
    });
  });

  /* Migração suave: se a pessoa não tem cargo interno cadastrado, lê o papel legado de neon_auth.user */
  it('falls back to legacy role from neon_auth.user when internal_roles is empty', async () => {
    const { provider } = makeProvider([userRow({ role: 'manager' })], []);

    await expect(provider.resolve('token')).resolves.toMatchObject({
      role: 'manager',
      roles: {
        infra: 'user',
        sistema: 'manager',
        manutencao: 'user',
      },
    });
  });

  it('recognizes superadmin from neon_auth.user and grants admin across all contexts by default', async () => {
    const { provider } = makeProvider([userRow({ role: 'superadmin' })], []);

    await expect(provider.resolve('token')).resolves.toMatchObject({
      role: 'superadmin',
      roles: {
        infra: 'admin',
        sistema: 'admin',
        manutencao: 'admin',
      },
    });
  });

  // triste
  /* Pessoa nova sem cargo atribuído em lugar nenhum cai no papel mais restrito (user) */
  it('falls back to the most restricted role (user) when there is no role anywhere', async () => {
    const { provider } = makeProvider([userRow({ role: null })], []);

    await expect(provider.resolve('token')).resolves.toMatchObject({
      role: 'user',
      roles: {
        infra: 'user',
        sistema: 'user',
        manutencao: 'user',
      },
    });
  });

  it('ignores invalid role in internal_roles and falls back to user', async () => {
    const roles = [internalRoleRow({ context: 'sistema', role: 'superuser' as any })];
    const { provider } = makeProvider([userRow()], roles);

    await expect(provider.resolve('token')).resolves.toMatchObject({
      role: 'user',
      roles: {
        infra: 'user',
        sistema: 'user',
        manutencao: 'user',
      },
    });
  });

  it('lets an expired ban through', async () => {
    const expired = new Date(Date.now() - 60_000);
    const { provider } = makeProvider([userRow({ banned: true, banExpires: expired })]);

    await expect(provider.resolve('token')).resolves.toMatchObject({ id: 'neon-user-1' });
  });

  it('refuses when token verification fails, without touching database', async () => {
    const { provider, verify } = makeProvider([userRow()], [], null);

    await expect(provider.resolve('token-falso')).resolves.toBeNull();
    expect(verify).toHaveBeenCalledWith('token-falso');
  });

  it('refuses when person is not in user registry', async () => {
    const { provider } = makeProvider([]);

    await expect(provider.resolve('token')).resolves.toBeNull();
  });

  it('refuses someone banned permanently', async () => {
    const { provider } = makeProvider([userRow({ banned: true, banExpires: null })]);

    await expect(provider.resolve('token')).resolves.toBeNull();
  });

  it('refuses someone whose ban has not expired', async () => {
    const future = new Date(Date.now() + 60_000);
    const { provider } = makeProvider([userRow({ banned: true, banExpires: future })]);

    await expect(provider.resolve('token')).resolves.toBeNull();
  });

  it('refuses user row without usable email', async () => {
    const { provider } = makeProvider([userRow({ email: '' })], [], { ...CLAIMS, email: null });

    await expect(provider.resolve('token')).resolves.toBeNull();
  });
});
