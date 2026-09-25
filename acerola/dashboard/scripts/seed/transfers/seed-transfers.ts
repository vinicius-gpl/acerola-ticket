import { sql } from 'drizzle-orm';

import { type Database } from '../../../server/src/lib/db/db.type';
import { computerTransfers } from '../../../server/src/lib/db/schema/computer-transfers.schema';
import { openSeedDatabase, report } from '../seed.util';
import { TRANSFERS_SEED } from './transfers.data';

/**
 * Grava o histórico de transferências de teste.
 *
 * Depende do seed do INVENTÁRIO: cada linha aponta para uma máquina, e o banco recusa o
 * histórico de uma máquina que não existe. Por isso `seedComputers` vem antes na lista de
 * `seed-all`.
 *
 * `onConflictDoUpdate` pelo `id` é o que torna o seed idempotente: a segunda execução
 * reescreve as mesmas linhas, em vez de somar três registros novos a cada rodada.
 */
export async function seedTransfers(db: Database): Promise<number> {
  await db
    .insert(computerTransfers)
    .values(TRANSFERS_SEED)
    .onConflictDoUpdate({
      target: computerTransfers.id,
      set: {
        computerId: sql`excluded.computer_id`,
        fromDepartment: sql`excluded.from_department`,
        toDepartment: sql`excluded.to_department`,
        responsible: sql`excluded.responsible`,
        note: sql`excluded.note`,
        peripheralsLeftBehind: sql`excluded.peripherals_left_behind`,
        createdAt: sql`excluded.created_at`,
        createdBy: sql`excluded.created_by`,
      },
    });

  await syncIdSequence(db);

  return TRANSFERS_SEED.length;
}

/**
 * Empurra o contador de `id` para depois da última linha gravada.
 *
 * Gravar com `id` explícito NÃO move o contador do Postgres. Sem isto, a primeira
 * transferência feita pela tela pediria o id 1 — que já existe — e a pessoa levaria um erro
 * sem ter feito nada de errado.
 */
async function syncIdSequence(db: Database): Promise<void> {
  await db.execute(
    sql`select setval(pg_get_serial_sequence('computer_transfers', 'id'), coalesce((select max(id) from computer_transfers), 0) + 1, false)`,
  );
}

/* Rodando sozinho (`npm run seed:transfers`), abre o banco e grava só esta entidade. */
if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('transferências', await seedTransfers(db));
    } finally {
      await close();
    }
  });
}
