import {
  INVENTORY_CATEGORIES,
  INVENTORY_UNITS,
} from '@template/shared/domain/inventory-catalog.util';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * O INVENTÁRIO DA MANUTENÇÃO: o que existe no escritório fora do parque de computadores —
 * mobiliário, mercadinho, limpeza, eletrodoméstico.
 *
 * Tabela própria, e não uma coluna a mais em `parts`: aquela é a prateleira da TI, com
 * condição (nova/usada) e saldo mantido pela própria API. Aqui o que importa é o PRODUTO —
 * o que é, em que medida se conta, onde fica e com que cara. O quanto existe de cada um é o
 * `balance`, movido pela tela de Depósito da Manutenção — com o histórico que explica o
 * número em `inventory_movements`.
 *
 * `photo_key` é o endereço do arquivo no R2, nunca um link: o link é assinado a cada leitura
 * e expira, como o print do chamado.
 */
export const inventoryItems = pgTable(
  'inventory_items',
  {
    id: serial('id').primaryKey(),

    name: text('name').notNull(),
    category: text('category', { enum: INVENTORY_CATEGORIES }).notNull(),
    unit: text('unit', { enum: INVENTORY_UNITS }).notNull().default('unit'),

    location: text('location'),
    code: text('code'),
    note: text('note'),
    photoKey: text('photo_key'),

    /* O saldo do Depósito. Quem o move é a API, junto com a linha de `inventory_movements`
       que o explica — nunca a edição do cadastro. `default 0`: os produtos que já existiam
       nascem sem estoque informado, e a primeira entrada é que diz quanto há. */
    balance: integer('balance').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('inventory_items_category_idx').on(table.category),
    index('inventory_items_name_idx').on(table.name),
    /* A REGRA DE UNICIDADE MORA NO BANCO (CONTRIBUTING §15). Vale só para o código de
       patrimônio, que é etiqueta colada na coisa: duas linhas com a mesma etiqueta fariam o
       inventário discordar da parede. O NOME repete à vontade — há cinco cadeiras iguais em
       salas diferentes, e cada uma é um registro. Produto sem etiqueta (`null`) não entra na
       regra: o Postgres não compara nulos entre si, e é exatamente o que se quer aqui. */
    unique('inventory_items_code_unique').on(table.code),
    check('inventory_items_category_valid', sql`${table.category} in (${valuesFor(INVENTORY_CATEGORIES)})`),
    check('inventory_items_unit_valid', sql`${table.unit} in (${valuesFor(INVENTORY_UNITS)})`),
    /* Saldo negativo é entrada esquecida. A API já recusa a saída que não cabe; esta é a
       trava de trás, para o caso de duas saídas passarem juntas. */
    check('inventory_items_balance_not_negative', sql`${table.balance} >= 0`),
  ],
);

export type InventoryItemRow = typeof inventoryItems.$inferSelect;
export type InventoryItemInsert = typeof inventoryItems.$inferInsert;
