import { join } from 'node:path';

import { config } from 'dotenv';
import { sql } from 'drizzle-orm';

import {
  describeDatabaseUrl,
  openDatabase,
  SERVER_ROOT,
  type OpenDatabase,
} from '../../server/src/lib/db/open-database.util';

/**
 * A porta de entrada de todo seed.
 *
 * As regras dos seeds (CONTRIBUTING §9), e onde cada uma é garantida:
 *  - **Nunca roda em produção** — `assertNotProduction`, aqui.
 *  - **Idempotente** — cada seed grava com `onConflictDoUpdate`: rodar duas vezes dá o mesmo
 *    resultado, e não o dobro de linhas.
 *  - **Imprime o que gravou** — `report`, aqui.
 *  - **Dado real de cliente não entra** — isso é revisão de PR; nenhuma máquina verifica.
 *
 * O banco é aberto pela MESMA função que o server usa. Por isso o seed aplica as migrations
 * antes de gravar, e funciona num clone novo, sem o server ter subido nenhuma vez.
 */
export async function openSeedDatabase(): Promise<OpenDatabase> {
  config({ path: join(SERVER_ROOT, '.env'), quiet: true });
  assertNotProduction();

  const url = requireDatabaseUrl();
  console.log(`Banco: ${describeDatabaseUrl(url)}`);

  return openDatabase(url);
}

/**
 * Esvazia as tabelas para recriar do zero.
 *
 * No SQLite isto apagava o ARQUIVO do banco. Com o Postgres hospedado não existe arquivo para
 * apagar, e derrubar o banco inteiro na Neon seria destruir o que o painel dela administra —
 * então o equivalente honesto é limpar as tabelas e deixar a estrutura de pé.
 *
 * `TRUNCATE ... RESTART IDENTITY CASCADE` zera junto os contadores de `id`: sem isso, o banco
 * "recriado" continuaria numerando a partir de onde o antigo parou, e nenhum seed com id fixo
 * bateria.
 */
export async function resetDatabase(): Promise<void> {
  config({ path: join(SERVER_ROOT, '.env'), quiet: true });
  assertNotProduction();

  const opened = await openDatabase(requireDatabaseUrl());
  try {
    /* Só as tabelas DESTE sistema. O cadastro de pessoas é do Neon Auth, mora no schema
       `neon_auth` e não se apaga por aqui: quem entra e quem sai é decidido no painel da
       Neon, e um seed que limpasse aquilo derrubaria o acesso de todo mundo. */
    await opened.db.execute(sql`truncate table tasks restart identity cascade`);
  } finally {
    await opened.close();
  }
}

export function report(entity: string, count: number): void {
  console.log(`  ✔ ${entity}: ${count} registro(s) gravado(s)`);
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (url) return url;

  throw new Error('DATABASE_URL não definida. Copie server/.env.example para server/.env.');
}

function assertNotProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;

  throw new Error(
    'Seed refused: NODE_ENV is production. Seeds only run against a development database.',
  );
}
