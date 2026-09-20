import { mkdirSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

import BetterSqlite3 from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { type Database } from './db.type';
import { drizzleSchema } from './drizzle-schema';

/**
 * A pasta `server/`, calculada a partir DESTE arquivo — e não do diretório em que o processo
 * foi iniciado.
 *
 * O mesmo server sobe de lugares diferentes: `npm run dev` roda dentro de `server/`, o Docker
 * roda `node server/dist/main.js` da raiz, e os seeds rodam da raiz do workspace. Resolver
 * `./data/app.db` pelo diretório atual abriria TRÊS bancos diferentes, e cada um pareceria
 * vazio para os outros dois.
 *
 * `src/lib/db` e `dist/lib/db` ficam à mesma distância de `server/`, então a conta vale para
 * o código-fonte e para o build.
 */
export const SERVER_ROOT = resolve(__dirname, '..', '..', '..');

/** As migrations versionadas, geradas por `npm run db:generate`. */
export const MIGRATIONS_FOLDER = join(SERVER_ROOT, 'drizzle');

export const IN_MEMORY = ':memory:';

export function resolveDatabaseFile(file: string): string {
  if (file === IN_MEMORY) return IN_MEMORY;
  if (isAbsolute(file)) return file;

  return resolve(SERVER_ROOT, file);
}

export type OpenDatabase = {
  db: Database;
  close: () => void;
};

/**
 * Abre o banco, liga as proteções e aplica as migrations pendentes.
 *
 * É a ÚNICA porta para o SQLite: o `DbModule`, os seeds e os testes E2E passam por aqui.
 * Três portas seriam três chances de uma delas esquecer o `foreign_keys` — e o SQLite, por
 * padrão, NÃO verifica chave estrangeira.
 */
export function openDatabase(file: string): OpenDatabase {
  const path = resolveDatabaseFile(file);
  if (path !== IN_MEMORY) mkdirSync(dirname(path), { recursive: true });

  const sqlite = new BetterSqlite3(path);

  /* Desligado por padrão no SQLite, por compatibilidade com 2001. Sem isto, apagar um
     registro deixa os filhos apontando para o nada, sem erro nenhum. */
  sqlite.pragma('foreign_keys = ON');

  /* WAL deixa leitura e escrita acontecerem ao mesmo tempo. Sem ele, o Drizzle Studio aberto
     numa aba trava a gravação do server com "database is locked". */
  if (path !== IN_MEMORY) sqlite.pragma('journal_mode = WAL');

  /* Espera até 5s pelo arquivo liberar, em vez de falhar na hora. Um seed rodando enquanto o
     server está no ar é o caso comum. */
  sqlite.pragma('busy_timeout = 5000');

  const db = drizzle(sqlite, { schema: drizzleSchema });

  /* Migration aplicada na partida: quem clona o projeto roda `npm run dev` e o banco já
     nasce com as tabelas. Esquecer `db:migrate` não é um passo que alguém deveria poder
     esquecer. */
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

  return { db, close: () => sqlite.close() };
}
