import { rmSync } from 'node:fs';
import { join } from 'node:path';

import { config } from 'dotenv';

import {
  IN_MEMORY,
  openDatabase,
  resolveDatabaseFile,
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
export function openSeedDatabase(): OpenDatabase {
  config({ path: join(SERVER_ROOT, '.env'), quiet: true });
  assertNotProduction();

  const file = process.env.DATABASE_FILE ?? './data/app.db';
  console.log(`Banco: ${resolveDatabaseFile(file)}`);

  return openDatabase(file);
}

/**
 * Apaga o arquivo do banco (e os dois arquivos do WAL que o acompanham), para recriar do zero.
 *
 * Sem apagar `-wal` e `-shm` junto, o SQLite reaproveitaria o diário de um banco que não existe
 * mais, e o "banco novo" nasceria com restos do antigo.
 */
export function deleteDatabaseFile(): void {
  config({ path: join(SERVER_ROOT, '.env'), quiet: true });
  assertNotProduction();

  const path = resolveDatabaseFile(process.env.DATABASE_FILE ?? './data/app.db');
  if (path === IN_MEMORY) return;

  for (const suffix of ['', '-wal', '-shm']) {
    rmSync(`${path}${suffix}`, { force: true });
  }
}

export function report(entity: string, count: number): void {
  console.log(`  ✔ ${entity}: ${count} registro(s) gravado(s)`);
}

function assertNotProduction(): void {
  if (process.env.NODE_ENV !== 'production') return;

  throw new Error(
    'Seed refused: NODE_ENV is production. Seeds only run against a local development database.',
  );
}
