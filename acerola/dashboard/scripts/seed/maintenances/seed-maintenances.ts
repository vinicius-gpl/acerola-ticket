import { sql } from 'drizzle-orm';

import { type Database } from '../../../server/src/lib/db/db.type';
import { maintenances } from '../../../server/src/lib/db/schema/maintenances.schema';
import { openSeedDatabase, report } from '../seed.util';
import { MAINTENANCES_SEED } from './maintenances.data';

/**
 * Grava o histórico de manutenção de teste.
 *
 * Depende do seed do INVENTÁRIO: as linhas apontam para as máquinas 1 a 8, e o banco recusa
 * uma manutenção de uma máquina que não existe. Por isso `seedComputers` vem antes na lista
 * de `seed-all`.
 *
 * `onConflictDoUpdate` pelo `id` é o que torna o seed idempotente: a segunda execução
 * reescreve as mesmas linhas, em vez de somar oito registros novos a cada rodada.
 */
export async function seedMaintenances(db: Database): Promise<number> {
  await db
    .insert(maintenances)
    .values(MAINTENANCES_SEED)
    .onConflictDoUpdate({
      target: maintenances.id,
      set: {
        computerId: sql`excluded.computer_id`,
        otherMachine: sql`excluded.other_machine`,
        type: sql`excluded.type`,
        description: sql`excluded.description`,
        performedBy: sql`excluded.performed_by`,
        performedAt: sql`excluded.performed_at`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`excluded.updated_at`,
        updatedBy: sql`excluded.updated_by`,
      },
    });

  await syncIdSequence(db);

  return MAINTENANCES_SEED.length;
}

/**
 * Empurra o contador de `id` para depois da última linha gravada.
 *
 * Gravar com `id` explícito NÃO move o contador do Postgres. Sem isto, a primeira manutenção
 * registrada pela tela pediria o id 1 — que já existe — e a pessoa levaria um erro sem ter
 * feito nada de errado.
 */
async function syncIdSequence(db: Database): Promise<void> {
  await db.execute(
    sql`select setval(pg_get_serial_sequence('maintenances', 'id'), coalesce((select max(id) from maintenances), 0) + 1, false)`,
  );
}

/* Rodando sozinho (`npm run seed:maintenances`), abre o banco e grava só esta entidade. */
if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('manutenções', await seedMaintenances(db));
    } finally {
      await close();
    }
  });
}
