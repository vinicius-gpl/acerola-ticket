import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';

import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';

/**
 * Quanto tempo esperar o banco antes de chamar a resposta de não. Curto de propósito: quem
 * pergunta é um healthcheck de container, e ele tem o próprio tempo limite — uma pergunta que
 * fica pendurada faz o orquestrador reiniciar no escuro, que é exatamente o que a rota de
 * saúde existe para evitar.
 */
const PING_TIMEOUT_MS = 3_000;

/**
 * O repository não tem regra: aqui ele faz a pergunta mais simples possível ao Postgres.
 *
 * É o ÚNICO repository do projeto que não passa por `runQuery`, e de propósito: `runQuery`
 * traduz falha do banco em exceção HTTP, e aqui a falha do banco é a RESPOSTA — não um erro.
 * Passar por lá transformaria "o banco está fora" em 500 genérico, e a rota de saúde perderia
 * a única coisa que ela sabe dizer.
 */
@Injectable()
export class HealthRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async isDatabaseUp(): Promise<boolean> {
    try {
      await withTimeout(this.db.execute(sql`select 1`), PING_TIMEOUT_MS);

      return true;
    } catch {
      return false;
    }
  }
}

/** Corre a consulta contra o relógio. O timer é sempre cancelado, para não segurar o processo. */
async function withTimeout(query: PromiseLike<unknown>, milliseconds: number): Promise<void> {
  let timer: NodeJS.Timeout | undefined;

  const clock = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error('Database ping timed out')), milliseconds);
  });

  try {
    await Promise.race([query, clock]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
