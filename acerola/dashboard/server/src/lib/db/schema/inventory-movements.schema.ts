import {
  DISPOSAL_REASONS,
  STOCK_MOVEMENT_TYPES,
} from '@template/shared/domain/inventory-stock.util';
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { inventoryItems } from './inventory-items.schema';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * CADA ENTRADA, SAÍDA E DESCARTE do depósito da Manutenção — o extrato da prateleira.
 *
 * É esta tabela que EXPLICA o saldo de `inventory_items`, e é dela que sai a tela de
 * Descarte: descarte é um movimento como os outros, com um motivo a mais. Uma tabela só para
 * os três porque os três mexem no mesmo número, e dois extratos do mesmo saldo é o jeito
 * mais rápido de os dois discordarem.
 *
 * Não há `updated_at`: linha de extrato não se corrige. Lançou errado, lança o contrário.
 *
 * `cascade` no produto: excluir um produto do inventário leva o extrato dele junto — sem o
 * produto, as linhas não explicam mais nada. Quem exclui é só quem gerencia a Manutenção.
 */
export const inventoryMovements = pgTable(
  'inventory_movements',
  {
    id: serial('id').primaryKey(),

    itemId: integer('item_id')
      .notNull()
      .references(() => inventoryItems.id, { onDelete: 'cascade' }),

    type: text('type', { enum: STOCK_MOVEMENT_TYPES }).notNull(),
    quantity: integer('quantity').notNull(),
    /* O saldo DEPOIS da linha, como o extrato de um banco: sem ele, ler "como chegamos em 3?"
       exigiria somar o histórico inteiro de novo a cada consulta. */
    balanceAfter: integer('balance_after').notNull(),

    reason: text('reason', { enum: DISPOSAL_REASONS }),
    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [
    /* "O que já aconteceu com este produto" é a consulta do extrato. */
    index('inventory_movements_item_time_idx').on(table.itemId, table.createdAt.desc()),
    /* "O que foi descartado" é a tela de Descarte inteira. */
    index('inventory_movements_type_time_idx').on(table.type, table.createdAt.desc()),
    check(
      'inventory_movements_type_valid',
      sql`${table.type} in (${valuesFor(STOCK_MOVEMENT_TYPES)})`,
    ),
    check('inventory_movements_quantity_positive', sql`${table.quantity} > 0`),
    /* O motivo existe no descarte, e só nele: descarte sem motivo é saída mal explicada, e
       entrada com motivo de descarte é dado que ninguém sabe ler.

       O `is not null` NÃO é redundante. Sem ele, um descarte sem motivo passava: `null in
       (...)` não dá falso, dá "indefinido", e o Postgres só recusa a linha quando a checagem
       dá FALSO. A primeira versão desta trava (migration 0022) tinha esse furo; a 0023 fecha. */
    check(
      'inventory_movements_reason_matches_type',
      sql`(${table.type} = 'disposal' and ${table.reason} is not null and ${table.reason} in (${valuesFor(DISPOSAL_REASONS)})) or (${table.type} <> 'disposal' and ${table.reason} is null)`,
    ),
  ],
);

export type InventoryMovementRow = typeof inventoryMovements.$inferSelect;
export type InventoryMovementInsert = typeof inventoryMovements.$inferInsert;
