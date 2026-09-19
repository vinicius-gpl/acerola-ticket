import { describe, expect, it } from 'vitest';

import { parseEnv } from './env.schema';

describe('parseEnv', () => {
  /* A máquina recém-clonada não tem `.env`, e o template precisa subir mesmo assim. */
  it('starts with no variable at all, using the defaults', () => {
    expect(parseEnv({})).toEqual({
      NODE_ENV: 'development',
      API_PORT: 3333,
      API_CORS_ORIGIN: 'http://localhost:5173',
      API_LOG_LEVEL: 'log',
      DATABASE_FILE: './data/app.db',
    });
  });

  it('reads the port that arrives as text, which is how the environment delivers it', () => {
    expect(parseEnv({ API_PORT: '8080' }).API_PORT).toBe(8080);
  });

  it('accepts an in-memory database', () => {
    expect(parseEnv({ DATABASE_FILE: ':memory:' }).DATABASE_FILE).toBe(':memory:');
  });

  // triste
  it('refuses a port out of range, naming the variable', () => {
    expect(() => parseEnv({ API_PORT: '0' })).toThrow(/API_PORT/);
    expect(() => parseEnv({ API_PORT: '99999' })).toThrow(/API_PORT/);
  });

  /* `DATABASE_FILE=` vazio é quase sempre um valor apagado sem querer. Abrir um banco novo em
     silêncio faria parecer que os dados sumiram. */
  it('refuses an empty database path instead of opening a new database silently', () => {
    expect(() => parseEnv({ DATABASE_FILE: '  ' })).toThrow(/DATABASE_FILE/);
  });

  it('refuses an unknown NODE_ENV', () => {
    expect(() => parseEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });
});
