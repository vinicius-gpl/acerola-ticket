import { PART_CATEGORIES, PART_CONDITIONS } from '@template/shared/domain/part-catalog.util';
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, serial, text, timestamp, unique } from 'drizzle-orm/pg-core';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * AS PEÇAS DE REPOSIÇÃO que a TI tem em mãos.
 *
 * **`balance` é coluna, mas não é campo digitado.** Ele é a soma das entradas menos as
 * saídas, e quem o escreve é o service, dentro da mesma transação da movimentação. Guardá-lo
 * é o que permite listar cinquenta peças sem somar o histórico de cada uma a cada consulta;
 * a garantia de que ele não vai à deriva é o `check` abaixo e o fato de existir um caminho
 * de escrita só.
 *
 * **Peça nova e peça usada são linhas DIFERENTES**, mesmo com o mesmo nome: somar as duas
 * esconderia que os quatro SSDs do estoque são todos usados na hora de escolher o que
 * instalar numa máquina nova. Por isso a unicidade é por nome + condição.
 */
export const parts = pgTable(
  'parts',
  {
    id: serial('id').primaryKey(),

    name: text('name').notNull(),
    category: text('category', { enum: PART_CATEGORIES }).notNull(),
    condition: text('condition', { enum: PART_CONDITIONS }).notNull().default('new'),

    balance: integer('balance').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('parts_category_idx').on(table.category),
    index('parts_name_idx').on(table.name),
    /* A REGRA DE UNICIDADE MORA NO BANCO (CONTRIBUTING §15): duas linhas do mesmo SSD usado
       fariam o estoque aparecer dividido em dois lugares, e ninguém saberia qual mexer. */
    unique('parts_name_condition_unique').on(table.name, table.condition),
    check('parts_category_valid', sql`${table.category} in (${valuesFor(PART_CATEGORIES)})`),
    check('parts_condition_valid', sql`${table.condition} in (${valuesFor(PART_CONDITIONS)})`),
    /* Saldo negativo é prateleira impossível. Se algum caminho de escrita errar a conta, o
       banco recusa aqui — antes de o número mentir para quem for buscar a peça. */
    check('parts_balance_not_negative', sql`${table.balance} >= 0`),
  ],
);

export type PartRow = typeof parts.$inferSelect;
export type PartInsert = typeof parts.$inferInsert;
