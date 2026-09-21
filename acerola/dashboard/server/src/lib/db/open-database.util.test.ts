import { isAbsolute, join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { describeDatabaseUrl, MIGRATIONS_FOLDER, SERVER_ROOT } from './open-database.util';

/**
 * `openDatabase` não é testada aqui: ela conecta num Postgres de verdade e aplica migrations.
 * Quem cobre isso é o E2E (`test/tasks.e2e.ts`), que sobe contra o banco de teste da
 * TEST_DATABASE_URL. No SQLite dava para abrir um banco em memória e testar tudo aqui; o
 * Postgres não tem equivalente, e fingir um banco testaria o dublê, não o sistema.
 */
describe('MIGRATIONS_FOLDER', () => {
  // feliz
  /* O server sobe de pastas diferentes (dev, Docker, seed). Resolver pelo diretório atual
     faria as migrations sumirem em duas das três. */
  it('points at the server folder, not at where the process started', () => {
    expect(isAbsolute(MIGRATIONS_FOLDER)).toBe(true);
    expect(MIGRATIONS_FOLDER).toBe(join(SERVER_ROOT, 'drizzle'));
  });
});

describe('describeDatabaseUrl', () => {
  // feliz
  /* A linha de partida diz em que banco o server conectou — é assim que se percebe um `.env`
     apontando para o lugar errado. Mas ela vai para o log, então a senha não pode ir junto. */
  it('names the host and the database without leaking the password', () => {
    const described = describeDatabaseUrl(
      'postgresql://app:senha-secreta@ep-exemplo.neon.tech/acerola?sslmode=require',
    );

    expect(described).toBe('ep-exemplo.neon.tech/acerola');
    expect(described).not.toContain('senha-secreta');
    expect(described).not.toContain('app');
  });

  it('says the database is the default one when the string has no path', () => {
    expect(describeDatabaseUrl('postgresql://app:senha@ep-exemplo.neon.tech')).toBe(
      'ep-exemplo.neon.tech/(padrão)',
    );
  });

  // triste
  /* Descrever a conexão é conveniência de log: falhar aqui derrubaria a partida por causa de
     uma linha informativa. */
  it('does not throw on a string it cannot read (edge case)', () => {
    expect(describeDatabaseUrl('isto não é uma url')).toBe('(string de conexão ilegível)');
    expect(describeDatabaseUrl('')).toBe('(string de conexão ilegível)');
  });
});
