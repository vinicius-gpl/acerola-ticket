import { sql } from 'drizzle-orm';

import { type Database } from '../../../server/src/lib/db/db.type';
import { inventoryMovements } from '../../../server/src/lib/db/schema/inventory-movements.schema';
import { openSeedDatabase, report } from '../seed.util';
import { INVENTORY_MOVEMENTS_SEED } from './inventory-movements.data';

/**
 * Grava o depósito de teste da Manutenção.
 *
 * DEPENDE do inventário: cada movimento aponta para um produto. Roda depois dele.
 *
 * `onConflictDoUpdate` pelo `id` é o que torna o seed idempotente: a segunda execução
 * reescreve as mesmas linhas.
 *
 * No fim, o SALDO de cada produto é refeito a partir do extrato inteiro — o do seed e o que
 * a pessoa tiver lançado pela tela. Gravar o saldo "do seed" por cima deixaria o número
 * discordando das linhas que ela mesma criou testando.
 */
export async function seedInventoryMovements(db: Database): Promise<number> {
  await db
    .insert(inventoryMovements)
    .values(INVENTORY_MOVEMENTS_SEED)
    .onConflictDoUpdate({
      target: inventoryMovements.id,
      set: {
        itemId: sql`excluded.item_id`,
        type: sql`excluded.type`,
        quantity: sql`excluded.quantity`,
        balanceAfter: sql`excluded.balance_after`,
        reason: sql`excluded.reason`,
        note: sql`excluded.note`,
        createdAt: sql`excluded.created_at`,
        createdBy: sql`excluded.created_by`,
      },
    });

  await recalculateBalances(db);
  await syncIdSequence(db);

  return INVENTORY_MOVEMENTS_SEED.length;
}

/** O saldo é o resultado do extrato: entrada soma, saída e descarte tiram. */
async function recalculateBalances(db: Database): Promise<void> {
  await db.execute(
    sql`update inventory_items set balance = greatest(0, coalesce((select sum(case when m.type = 'in' then m.quantity else -m.quantity end) from inventory_movements m where m.item_id = inventory_items.id), 0))`,
  );
}

/**
 * Põe o contador de `id` da tabela acima do maior id gravado. Gravar com `id` explícito NÃO
 * move o contador do Postgres — sem isto, o primeiro movimento lançado pela tela pediria um
 * id que já existe.
 */
async function syncIdSequence(db: Database): Promise<void> {
  await db.execute(
    sql`select setval(pg_get_serial_sequence('inventory_movements', 'id'), coalesce((select max(id) from inventory_movements), 0) + 1, false)`,
  );
}

/* Rodando sozinho (`npm run seed:inventory-movements`), grava só esta entidade. */
if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('movimentos do depósito da Manutenção', await seedInventoryMovements(db));
    } finally {
      await close();
    }
  });
}
