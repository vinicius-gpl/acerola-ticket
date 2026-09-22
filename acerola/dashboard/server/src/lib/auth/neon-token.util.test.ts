import { exportJWK, generateKeyPair, SignJWT, type CryptoKey } from 'jose';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { createNeonTokenVerifier, readBearerToken } from './neon-token.util';

/**
 * O teste gera o PRÓPRIO par de chaves e finge ser a Neon: assim ele prova o que importa —
 * que token assinado pela chave certa passa e qualquer outro não — sem depender de internet
 * nem de uma conta de verdade.
 */
const AUTH_URL = 'https://ep-exemplo.neonauth.sa-east-1.aws.neon.tech/neondb/auth';
const ISSUER = 'https://ep-exemplo.neonauth.sa-east-1.aws.neon.tech';
const KID = 'chave-de-teste';

let privateKey: CryptoKey;
let jwks: { keys: unknown[] };

beforeAll(async () => {
  const pair = await generateKeyPair('EdDSA', { crv: 'Ed25519', extractable: true });
  privateKey = pair.privateKey;
  jwks = { keys: [{ ...(await exportJWK(pair.publicKey)), alg: 'EdDSA', kid: KID, use: 'sig' }] };
});

function servePublicKeys(): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(jwks), { status: 200 }))),
  );
}

type TokenOptions = { issuer?: string; subject?: string; expiresIn?: string; key?: CryptoKey };

async function signToken(claims: Record<string, unknown>, options: TokenOptions = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'EdDSA', kid: KID })
    .setIssuedAt()
    .setIssuer(options.issuer ?? ISSUER)
    .setSubject(options.subject ?? 'user-abc')
    .setExpirationTime(options.expiresIn ?? '5m')
    .sign(options.key ?? privateKey);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createNeonTokenVerifier', () => {
  // feliz
  it('accepts a token signed by the published key', async () => {
    servePublicKeys();
    const verify = createNeonTokenVerifier(AUTH_URL);

    const claims = await verify(await signToken({ email: 'ana@empresa.com.br', name: 'Ana' }));

    expect(claims).toEqual({ userId: 'user-abc', email: 'ana@empresa.com.br', name: 'Ana' });
  });

  it('accepts the auth URL with a trailing slash', async () => {
    servePublicKeys();
    const verify = createNeonTokenVerifier(`${AUTH_URL}/`);

    await expect(verify(await signToken({}))).resolves.toMatchObject({ userId: 'user-abc' });
  });

  // triste
  /* A trava que sustenta tudo: sem conferir a assinatura, qualquer um se declararia admin. */
  it('refuses a token signed by another key', async () => {
    servePublicKeys();
    const intruder = await generateKeyPair('EdDSA', { crv: 'Ed25519', extractable: true });
    const verify = createNeonTokenVerifier(AUTH_URL);

    await expect(verify(await signToken({}, { key: intruder.privateKey }))).resolves.toBeNull();
  });

  it('refuses a token from another issuer', async () => {
    servePublicKeys();
    const verify = createNeonTokenVerifier(AUTH_URL);

    await expect(verify(await signToken({}, { issuer: 'https://outro.exemplo' }))).resolves.toBe(
      null,
    );
  });

  it('refuses an expired token', async () => {
    servePublicKeys();
    const verify = createNeonTokenVerifier(AUTH_URL);

    await expect(verify(await signToken({}, { expiresIn: '-1m' }))).resolves.toBeNull();
  });

  it('refuses text that is not a token at all', async () => {
    servePublicKeys();
    const verify = createNeonTokenVerifier(AUTH_URL);

    await expect(verify('nao-e-um-token')).resolves.toBeNull();
  });

  /* Sem `sub` não há de quem ler o cadastro: identidade incompleta não vira meia identidade. */
  it('refuses a token without a subject', async () => {
    servePublicKeys();
    const verify = createNeonTokenVerifier(AUTH_URL);

    await expect(verify(await signToken({}, { subject: '   ' }))).resolves.toBeNull();
  });

  it('refuses everything when the keys cannot be fetched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('fora do ar', { status: 500 }))),
    );
    const verify = createNeonTokenVerifier(AUTH_URL);

    await expect(verify(await signToken({}))).resolves.toBeNull();
  });
});

describe('readBearerToken', () => {
  // feliz
  it('reads the token after the Bearer word, in any case', () => {
    expect(readBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(readBearerToken('bearer abc')).toBe('abc');
  });

  it('uses the first value of a repeated header', () => {
    expect(readBearerToken(['Bearer abc', 'Bearer xyz'])).toBe('abc');
  });

  // triste
  it('ignores a header that is not a Bearer', () => {
    expect(readBearerToken('Basic YWJjOjEyMw==')).toBeNull();
    expect(readBearerToken('abc.def.ghi')).toBeNull();
  });

  it('ignores an absent or empty header', () => {
    expect(readBearerToken(undefined)).toBeNull();
    expect(readBearerToken('Bearer')).toBeNull();
    expect(readBearerToken('Bearer   ')).toBeNull();
  });
});
