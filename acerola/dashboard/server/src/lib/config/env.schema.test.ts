import { describe, expect, it } from 'vitest';

import { parseEnv } from './env.schema';

/** O mínimo que o processo exige: os segredos, que não têm padrão. Valores inventados. */
const secrets = {
  DATABASE_URL: 'postgresql://app:senha@ep-exemplo.neon.tech/acerola?sslmode=require',
  R2_ACCOUNT_ID: 'conta-de-exemplo',
  R2_ACCESS_KEY_ID: 'chave-de-exemplo',
  R2_SECRET_ACCESS_KEY: 'segredo-de-exemplo',
  R2_BUCKET: 'arquivos',
};

describe('parseEnv', () => {
  // feliz
  it('fills in every non-secret with a default, so only the secrets need to be written', () => {
    expect(parseEnv(secrets)).toEqual({
      ...secrets,
      NODE_ENV: 'development',
      API_PORT: 3336,
      API_CORS_ORIGIN: 'http://localhost:5176',
      API_LOG_LEVEL: 'log',
      R2_SIGNED_URL_TTL_SECONDS: 300,
    });
  });

  it('reads the port that arrives as text, which is how the environment delivers it', () => {
    expect(parseEnv({ ...secrets, API_PORT: '8080' }).API_PORT).toBe(8080);
  });

  /* O banco de teste é opcional: sem ele o sistema sobe, só os testes E2E não rodam. */
  it('treats the test database as optional', () => {
    expect(parseEnv(secrets).TEST_DATABASE_URL).toBeUndefined();
    expect(parseEnv({ ...secrets, TEST_DATABASE_URL: 'postgresql://t' }).TEST_DATABASE_URL).toBe(
      'postgresql://t',
    );
  });

  // triste
  /* Segredo não tem padrão razoável. Subir sem ele adiaria a falha até a primeira gravação,
     quando o motivo já não estaria à vista. */
  it('refuses to start when a secret is missing, naming it', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ DATABASE_URL: secrets.DATABASE_URL })).toThrow(/R2_ACCOUNT_ID/);
  });

  /* Apontar o server para um banco que não é Postgres falharia muito depois, com uma
     mensagem da biblioteca que não ajuda ninguém. */
  it('refuses a connection string that is not Postgres', () => {
    expect(() => parseEnv({ ...secrets, DATABASE_URL: './data/app.db' })).toThrow(/DATABASE_URL/);
    expect(() => parseEnv({ ...secrets, DATABASE_URL: 'mysql://x/y' })).toThrow(/DATABASE_URL/);
  });

  it('refuses a port out of range, naming the variable', () => {
    expect(() => parseEnv({ ...secrets, API_PORT: '0' })).toThrow(/API_PORT/);
    expect(() => parseEnv({ ...secrets, API_PORT: '99999' })).toThrow(/API_PORT/);
  });

  /* Link assinado eterno deixa de ser "baixe agora" e vira um endereço público. */
  it('refuses a signed url lifetime longer than an hour', () => {
    expect(() => parseEnv({ ...secrets, R2_SIGNED_URL_TTL_SECONDS: '7200' })).toThrow(
      /R2_SIGNED_URL_TTL_SECONDS/,
    );
  });

  it('refuses an unknown NODE_ENV', () => {
    expect(() => parseEnv({ ...secrets, NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
