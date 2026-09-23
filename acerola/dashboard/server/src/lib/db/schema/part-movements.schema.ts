import { MOVEMENT_TYPES } from '@template/shared/domain/part-catalog.util';
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { computers } from './computers.schema';
import { parts } from './parts.schema';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * CADA ENTRADA E CADA SAÍDA do depósito — o extrato da prateleira.
 *
 * É esta tabela que EXPLICA o saldo: sem ela, "temos 3 mouses" é uma afirmação sem prova, e a
 * primeira divergência com a prateleira vira discussão sem registro para consultar.
 *
 * `balanceAfter` guarda o saldo DEPOIS da linha, como o extrato de um banco. Ele é
 * redundante de propósito: sem essa coluna, ler "como chegamos em 3?" exigiria somar o
 * histórico inteiro de novo a cada consulta, e uma linha excluída no meio deixaria a soma
 * impossível de conferir.
 *
 * `restrict` na peça: apagar uma peça com histórico é apagar a explicação do que saiu do
 * depósito. Peça que não se usa mais fica com saldo zero, não some.
 */
export const partMovements = pgTable(
  'part_movements',
  {
    id: serial('id').primaryKey(),

    partId: integer('part_id')
      .notNull()
      .references(() => parts.id, { onDelete: 'restrict' }),

    type: text('type', { enum: MOVEMENT_TYPES }).notNull(),
    quantity: integer('quantity').notNull(),
    balanceAfter: integer('balance_after').notNull(),

    /* Para qual máquina a peça foi. `set null`, e não `cascade`: se um dia um computador for
       apagado, a movimentação continua contando que uma peça saiu do depósito. */
    computerId: integer('computer_id').references(() => computers.id, { onDelete: 'set null' }),

    /* Texto livre: quem pegou a peça pode não ter login no sistema. */
    handledBy: text('handled_by'),
    note: text('note'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    /* "O que já aconteceu com esta peça" é a consulta do extrato. */
    index('part_movements_part_time_idx').on(table.partId, table.createdAt.desc()),
    /* "Que peças esta máquina recebeu" é a consulta da ficha do computador. */
    index('part_movements_computer_idx').on(table.computerId),
    check('part_movements_type_valid', sql`${table.type} in (${valuesFor(MOVEMENT_TYPES)})`),
    /* Movimentação de zero não move nada, e negativa é a outra movimentação escrita ao
       contrário — as duas embaralhariam o extrato. */
    check('part_movements_quantity_positive', sql`${table.quantity} > 0`),
  ],
);

export type PartMovementRow = typeof partMovements.$inferSelect;
export type PartMovementInsert = typeof partMovements.$inferInsert;
