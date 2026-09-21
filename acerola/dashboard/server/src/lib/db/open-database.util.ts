import { join, resolve } from 'node:path';

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

import { type Database } from './db.type';
import { drizzleSchema } from './drizzle-schema';

/**
 * A pasta `server/`, calculada a partir DESTE arquivo — e não do diretório em que o processo
 * foi iniciado.
 *
 * O mesmo server sobe de lugares diferentes: `npm run dev` roda dentro de `server/`, o Docker
 * roda `node server/dist/main.js` da raiz, e os seeds rodam da raiz do workspace. As
 * migrations precisam ser achadas nos três casos.
 *
 * `src/lib/db` e `dist/lib/db` ficam à mesma distância de `server/`, então a conta vale para
 * o código-fonte e para o build.
 */
export const SERVER_ROOT = resolve(__dirname, '..', '..', '..');

/** As migrations versionadas, geradas por `npm run db:generate`. */
export const MIGRATIONS_FOLDER = join(SERVER_ROOT, 'drizzle');

export type OpenDatabase = {
  db: Database;
  close: () => Promise<void>;
};

/**
 * Abre a conexão com o Postgres e aplica as migrations pendentes.
 *
 * É a ÚNICA porta para o banco: o `DbModule`, os seeds e os testes E2E passam por aqui.
 *
 * `max: 1` não é economia, é correção: o `migrate` do Drizzle roda uma migration por vez e
 * precisa que a trava de migração e o DDL aconteçam na MESMA conexão. Com um pool maior, dois
 * processos subindo ao mesmo tempo (o server e um seed, por exemplo) podem aplicar a mesma
 * migration duas vezes. Para a carga de um MVP, uma conexão sobra — e a Neon cobra por
 * conexão aberta.
 */
export async function openDatabase(url: string): Promise<OpenDatabase> {
  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql, { schema: drizzleSchema });

  /* Migration aplicada na partida: quem clona o projeto roda `npm run dev` e o banco já
     nasce com as tabelas. Esquecer `db:migrate` não é um passo que alguém deveria poder
     esquecer. */
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

  return { db, close: () => sql.end() };
}

/**
 * Esconde a senha da string de conexão, para ela poder ser registrada em log.
 *
 * O log de partida diz em que banco o server conectou — e essa informação é útil o bastante
 * para valer o cuidado de não vazar a credencial junto. Um `.env` errado apontando para o
 * banco de produção é o tipo de coisa que só se percebe olhando essa linha.
 */
export function describeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const database = parsed.pathname.replace(/^\//, '') || '(padrão)';

    return `${parsed.host}/${database}`;
  } catch {
    return '(string de conexão ilegível)';
  }
}
