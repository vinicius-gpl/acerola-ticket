import { describe, expect, it, vi } from 'vitest';

import { type Database } from '../db/db.type';
import { type NeonAuthUserRow } from '../db/schema/neon-auth-user.schema';
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
    role: 'manager',
    banned: false,
    banReason: null,
    banExpires: null,
    ...overrides,
  };
}

/** Finge a consulta do Drizzle: `select().from().where().limit()` devolve as linhas dadas. */
function fakeDatabase(rows: NeonAuthUserRow[]): Database {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));

  return { select: vi.fn(() => ({ from })) } as unknown as Database;
}

function makeProvider(rows: NeonAuthUserRow[], claims: NeonTokenClaims | null = CLAIMS) {
  const verify: NeonTokenVerifier = vi.fn().mockResolvedValue(claims);

  return { provider: new IdentityProvider(verify, fakeDatabase(rows)), verify };
}

describe('IdentityProvider.resolve', () => {
  // feliz
  it('builds the identity from the registry, not from the token', async () => {
    const { provider } = makeProvider([userRow({ name: 'Ana Maria' })]);

    await expect(provider.resolve('token')).resolves.toEqual({
      id: 'neon-user-1',
      email: 'ana@empresa.com.br',
      name: 'Ana Maria',
      role: 'manager',
    });
  });

  /* Conta recém-criada no painel da Neon ainda não tem papel — e precisa entrar como o mais
     restrito, nunca como administrador. */
  it('falls back to the most restricted role when there is none', async () => {
    const { provider } = makeProvider([userRow({ role: null })]);

    await expect(provider.resolve('token')).resolves.toMatchObject({ role: 'user' });
  });

  it('ignores a role that does not exist in the system', async () => {
    const { provider } = makeProvider([userRow({ role: 'superuser' })]);

    await expect(provider.resolve('token')).resolves.toMatchObject({ role: 'user' });
  });

  it('lets a ban that already expired through', async () => {
    const expired = new Date(Date.now() - 60_000);
    const { provider } = makeProvider([userRow({ banned: true, banExpires: expired })]);

    await expect(provider.resolve('token')).resolves.toMatchObject({ id: 'neon-user-1' });
  });

  // triste
  it('refuses when the token does not check out, without touching the database', async () => {
    const { provider, verify } = makeProvider([userRow()], null);

    await expect(provider.resolve('token-falso')).resolves.toBeNull();
    expect(verify).toHaveBeenCalledWith('token-falso');
  });

  /* Conta apagada no painel: o token continua válido por até 15 minutos, e é a leitura do
     cadastro que fecha a porta na mesma hora. */
  it('refuses when the person is no longer in the registry', async () => {
    const { provider } = makeProvider([]);

    await expect(provider.resolve('token')).resolves.toBeNull();
  });

  it('refuses someone banned with no end date', async () => {
    const { provider } = makeProvider([userRow({ banned: true, banExpires: null })]);

    await expect(provider.resolve('token')).resolves.toBeNull();
  });

  it('refuses someone whose ban has not expired yet', async () => {
    const future = new Date(Date.now() + 60_000);
    const { provider } = makeProvider([userRow({ banned: true, banExpires: future })]);

    await expect(provider.resolve('token')).resolves.toBeNull();
  });

  it('refuses a registry row without a usable e-mail', async () => {
    const { provider } = makeProvider([userRow({ email: '' })], { ...CLAIMS, email: null });

    await expect(provider.resolve('token')).resolves.toBeNull();
  });
});
