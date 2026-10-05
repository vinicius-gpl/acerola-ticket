import { sql } from 'drizzle-orm';

import { type Database } from '../../../server/src/lib/db/db.type';
import { inventoryItems } from '../../../server/src/lib/db/schema/inventory-items.schema';
import { openSeedDatabase, report } from '../seed.util';
import { INVENTORY_ITEMS_SEED } from './inventory-items.data';

/**
 * Grava o inventário de teste da Manutenção.
 *
 * Não depende de ninguém: produto do escritório não aponta para máquina nem para chamado.
 *
 * `onConflictDoUpdate` pelo `id` é o que torna o seed idempotente: a segunda execução
 * reescreve as mesmas linhas — quem renomeou um produto na tela o vê voltar ao nome original,
 * que é exatamente o que "rodar o seed" promete.
 *
 * A FOTO não é reescrita: quem subiu uma imagem testando a tela não a perde ao rodar o seed
 * de novo, e o arquivo no R2 não vira órfão.
 */
export async function seedInventoryItems(db: Database): Promise<number> {
  await db
    .insert(inventoryItems)
    .values(INVENTORY_ITEMS_SEED)
    .onConflictDoUpdate({
      target: inventoryItems.id,
      set: {
        name: sql`excluded.name`,
        category: sql`excluded.category`,
        unit: sql`excluded.unit`,
        location: sql`excluded.location`,
        code: sql`excluded.code`,
        note: sql`excluded.note`,
        createdAt: sql`excluded.created_at`,
        updatedAt: sql`excluded.updated_at`,
        updatedBy: sql`excluded.updated_by`,
      },
    });

  await syncIdSequence(db);

  return INVENTORY_ITEMS_SEED.length;
}

/**
 * Põe o contador de `id` da tabela acima do maior id gravado.
 *
 * Gravar com `id` explícito NÃO move o contador do Postgres. Sem isto, o primeiro produto
 * cadastrado pela tela pediria o id 1 — que já existe — e a pessoa levaria um erro sem ter
 * feito nada de errado.
 */
async function syncIdSequence(db: Database): Promise<void> {
  await db.execute(
    sql`select setval(pg_get_serial_sequence('inventory_items', 'id'), coalesce((select max(id) from inventory_items), 0) + 1, false)`,
  );
}

/* Rodando sozinho (`npm run seed:inventory`), abre o banco e grava só esta entidade. */
if (require.main === module) {
  void openSeedDatabase().then(async ({ db, close }) => {
    try {
      report('produtos do inventário', await seedInventoryItems(db));
    } finally {
      await close();
    }
  });
}
