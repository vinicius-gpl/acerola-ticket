import { isAbsolute, join } from 'node:path';

import { sql } from 'drizzle-orm';
import { afterEach, describe, expect, it } from 'vitest';

import { tasks } from './schema/tasks.schema';
import {
  IN_MEMORY,
  openDatabase,
  resolveDatabaseFile,
  SERVER_ROOT,
  type OpenDatabase,
} from './open-database.util';

describe('resolveDatabaseFile', () => {
  /* O server sobe de pastas diferentes (dev, Docker, seed). Resolver pelo diretório atual
     abriria um banco diferente em cada uma. */
  it('resolves a relative path from the server folder, not from where the process started', () => {
    expect(resolveDatabaseFile('./data/app.db')).toBe(join(SERVER_ROOT, 'data', 'app.db'));
  });

  it('keeps an absolute path as it is', () => {
    const absolute = join(SERVER_ROOT, 'elsewhere.db');

    expect(isAbsolute(absolute)).toBe(true);
    expect(resolveDatabaseFile(absolute)).toBe(absolute);
  });

  it('keeps the in-memory marker untouched', () => {
    expect(resolveDatabaseFile(IN_MEMORY)).toBe(IN_MEMORY);
  });
});

describe('openDatabase', () => {
  let opened: OpenDatabase | null = null;

  afterEach(() => {
    opened?.close();
    opened = null;
  });

  // feliz
  it('applies the migrations, so a brand-new database already has the tables', async () => {
    opened = openDatabase(IN_MEMORY);

    await opened.db.insert(tasks).values({ title: 'Primeira', createdBy: 'dev@template.local' });
    const rows = await opened.db.select().from(tasks);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe('todo');
    expect(rows[0]?.createdAt).toBeInstanceOf(Date);
  });

  /* O SQLite NÃO verifica chave estrangeira por padrão. Se este teste cair, apagar um
     registro passa a deixar filhos órfãos sem erro nenhum. */
  it('turns foreign key enforcement on', () => {
    opened = openDatabase(IN_MEMORY);

    const [row] = opened.db.all<{ foreign_keys: number }>(sql`PRAGMA foreign_keys`);

    expect(row?.foreign_keys).toBe(1);
  });

  // triste
  it('makes the database itself refuse a status that is not on the list', async () => {
    opened = openDatabase(IN_MEMORY);
    const db = opened.db;

    await expect(
      db
        .insert(tasks)
        .values({ title: 'X', createdBy: 'dev@template.local', status: 'late' as never }),
    ).rejects.toThrow();
  });
});
