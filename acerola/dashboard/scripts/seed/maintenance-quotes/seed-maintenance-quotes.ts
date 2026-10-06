import { sql } from 'drizzle-orm';

import { type Database } from '../../../server/src/lib/db/db.type';
import { maintenanceQuotes } from '../../../server/src/lib/db/schema/maintenance-quotes.schema';
import { openSeedDatabase, report } from '../seed.util';
import { MAINTENANCE_QUOTES_SEED } from './maintenance-quotes.data';

/**
 * Grava os orçamentos de teste da Manutenção.
 *
 * Não depende de ninguém: orçamento não aponta para produto, máquina nem chamado.
 *
 * `onConflictDoUpdate` pelo `id` é o que torna o seed idempotente: a segunda execução
 * reescreve as mesmas linhas.
 *
 * O DOCUMENTO não é reescrito: quem anexou um arquivo testando a tela não o perde ao rodar o
 * seed de novo, e o arquivo no R2 não vira órfão.
 */
export async function seedMaintenanceQuotes(db: Database): Promise<number> {
  await db
    .insert(maintenanceQuotes)
    .values(MAINTENANCE_QUOTES_SEED)
    .onConflictDoUpdate({
      target: maintenanceQuotes.id,
      set: {
        supplier: sql`excluded.supplier`,
        description: sql`excluded.description`,
        kind: sql`excluded.kind`,
        amountCents: sql`excluded.amount_cents`,
        quotedOn: sql`excluded.quoted_on`,
        status: sql`excluded.status`,
        decidedAt: sql`excluded.decided_at`,
        note: sql`excluded.note`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`excluded.updated_at`,
        updatedBy: sql`excluded.updated_by`,
      },
    });

  await syncIdSequence(db);

  return MAINTENANCE_QUOTES_SEED.length;
}

/**
 * Põe o contador de `id` da tabela acima do maior id gravado. Gravar com `id` explícito NÃO
 * move o contador do Postgres — sem isto, o primeiro orçamento guardado pela tela pediria um
 * id que já existe.
 */
async function syncIdSequence(db: Database): Promise<void> {
  await db.execute(
    sql`select setval(pg_get_serial_sequence('maintenance_quotes', 'id'), coalesce((select max(id) from maintenance_quotes), 0) + 1, false)`,
  );
}

/* Rodando sozinho (`npm run seed:maintenance-quotes`), grava só esta entidade. */
if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('orçamentos da Manutenção', await seedMaintenanceQuotes(db));
    } finally {
      await close();
    }
  });
}
