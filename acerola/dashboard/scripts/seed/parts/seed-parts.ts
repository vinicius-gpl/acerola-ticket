import { sql } from 'drizzle-orm';

import { type Database } from '../../../server/src/lib/db/db.type';
import { partMovements } from '../../../server/src/lib/db/schema/part-movements.schema';
import { parts } from '../../../server/src/lib/db/schema/parts.schema';
import { openSeedDatabase, report } from '../seed.util';
import { PARTS_SEED, PART_MOVEMENTS_SEED } from './parts.data';

/**
 * Grava o depósito de teste: as peças e o extrato delas.
 *
 * A ORDEM É DEPENDÊNCIA: a movimentação aponta para a peça e para a máquina, e o Postgres
 * recusa a linha se elas ainda não existirem. Por isso `seedComputers` e as peças vêm antes
 * das movimentações.
 *
 * `onConflictDoUpdate` pelo `id` é o que torna o seed idempotente: a segunda execução
 * reescreve as mesmas linhas — quem deu baixa numa peça de teste na tela a vê voltar ao
 * saldo original, que é exatamente o que "rodar o seed" promete.
 */
export async function seedParts(db: Database): Promise<number> {
  await db
    .insert(parts)
    .values(PARTS_SEED)
    .onConflictDoUpdate({
      target: parts.id,
      set: {
        name: sql`excluded.name`,
        category: sql`excluded.category`,
        condition: sql`excluded.condition`,
        balance: sql`excluded.balance`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`excluded.updated_at`,
        updatedBy: sql`excluded.updated_by`,
      },
    });

  await db
    .insert(partMovements)
    .values(PART_MOVEMENTS_SEED)
    .onConflictDoUpdate({
      target: partMovements.id,
      set: {
        partId: sql`excluded.part_id`,
        type: sql`excluded.type`,
        quantity: sql`excluded.quantity`,
        balanceAfter: sql`excluded.balance_after`,
        computerId: sql`excluded.computer_id`,
        handledBy: sql`excluded.handled_by`,
        note: sql`excluded.note`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`excluded.updated_at`,
        updatedBy: sql`excluded.updated_by`,
      },
    });

  await syncIdSequences(db);

  return PARTS_SEED.length;
}

/**
 * Empurra os contadores de `id` para depois da última linha gravada.
 *
 * Gravar com `id` explícito NÃO move o contador do Postgres. Sem isto, a primeira peça
 * cadastrada pela tela pediria o id 1 — que já existe — e a pessoa levaria um erro sem ter
 * feito nada de errado.
 */
async function syncIdSequences(db: Database): Promise<void> {
  const tables = ['parts', 'part_movements'] as const;

  for (const table of tables) {
    await db.execute(
      sql`select setval(pg_get_serial_sequence(${table}, 'id'), coalesce((select max(id) from ${sql.identifier(table)}), 0) + 1, false)`,
    );
  }
}

/* Rodando sozinho (`npm run seed:parts`), abre o banco e grava só esta entidade. */
if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('peças do depósito', await seedParts(db));
    } finally {
      await close();
    }
  });
}
