import { Inject, Injectable } from '@nestjs/common';
import { type InventoryItemListQuery } from '@template/shared/schemas/inventory-item.schema';
import { and, asc, count, eq, ilike, or, type SQL } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  inventoryItems,
  type InventoryItemInsert,
  type InventoryItemRow,
} from '../../../lib/db/schema/inventory-items.schema';

export type InventoryItemPage = { rows: InventoryItemRow[]; total: number };

/**
 * O repository não tem regra: traduz filtro em consulta e devolve linha. Quem pode o quê, o
 * que carimbar e o que fazer com a foto vive no service.
 */
@Injectable()
export class InventoryItemsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: InventoryItemListQuery): Promise<InventoryItemPage> {
    const where = buildWhere(query);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(inventoryItems)
          .where(where)
          /* Por categoria e depois por nome: quem abre o inventário procura "as cadeiras",
             não o produto cadastrado mais recentemente. */
          .orderBy(asc(inventoryItems.category), asc(inventoryItems.name))
          .limit(query.pageSize)
          .offset(offset),
        'listar produtos do inventário',
      ),
      runQuery(
        this.db.select({ total: count() }).from(inventoryItems).where(where),
        'contar produtos do inventário',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async findById(id: number): Promise<InventoryItemRow | null> {
    return runMaybe(
      this.db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1),
      'ler produto do inventário',
    );
  }

  async insert(values: InventoryItemInsert): Promise<InventoryItemRow> {
    const [row] = await runQuery(
      this.db.insert(inventoryItems).values(values).returning(),
      'cadastrar produto do inventário',
    );

    /* O `returning` sempre devolve a linha inserida; o tipo é que não sabe disso. */
    return row as InventoryItemRow;
  }

  async update(
    id: number,
    values: Partial<InventoryItemInsert>,
  ): Promise<InventoryItemRow | null> {
    const [row] = await runQuery(
      this.db
        .update(inventoryItems)
        .set(values)
        .where(eq(inventoryItems.id, id))
        .returning(),
      'alterar produto do inventário',
    );

    return row ?? null;
  }

  async remove(id: number): Promise<void> {
    await runQuery(
      this.db.delete(inventoryItems).where(eq(inventoryItems.id, id)),
      'excluir produto do inventário',
    );
  }
}

/**
 * A busca procura no nome, no lugar e no código: é por um desses três que alguém procura um
 * produto — "cadeira", "sala da fiscal" ou a etiqueta que está colada nele.
 */
function buildWhere(query: InventoryItemListQuery): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (query.category) filters.push(eq(inventoryItems.category, query.category));

  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(
      or(
        ilike(inventoryItems.name, term),
        ilike(inventoryItems.location, term),
        ilike(inventoryItems.code, term),
      ),
    );
  }

  return filters.length > 0 ? and(...filters) : undefined;
}
