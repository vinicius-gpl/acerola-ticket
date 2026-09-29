import { DEPARTMENTS } from '@template/shared/domain/department.util';
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { computers } from './computers.schema';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * CADA MUDANÇA DE DEPARTAMENTO de uma máquina — de onde saiu, para onde foi, quem e quando.
 *
 * O departamento ATUAL continua em `computers.department`: esta tabela é o histórico, não a
 * verdade do presente. Sem ela, "por que esta máquina está no fiscal?" seis meses depois não
 * tem resposta — o campo guarda só o último valor, e a mudança anterior desapareceu.
 *
 * `fromDepartment` fica gravado em vez de ser deduzido da linha anterior: a dedução quebra na
 * primeira vez que alguém corrigir o departamento pela tela de edição, sem passar por aqui.
 *
 * `restrict` na máquina: apagar um computador com histórico é apagar a explicação de onde ele
 * andou. Máquina que saiu de uso é arquivada, não apagada.
 */
export const computerTransfers = pgTable(
  'computer_transfers',
  {
    id: serial('id').primaryKey(),

    computerId: integer('computer_id')
      .notNull()
      .references(() => computers.id, { onDelete: 'restrict' }),

    /* Nulo dos dois lados é um destino de verdade: "sem departamento" é a prateleira. */
    fromDepartment: text('from_department', { enum: DEPARTMENTS }),
    toDepartment: text('to_department', { enum: DEPARTMENTS }),

    /* Quem levou a máquina. Texto livre: pode ser alguém sem login no sistema. */
    responsible: text('responsible'),
    note: text('note'),

    /* Quantos periféricos ficaram na estação nesta mudança — o resumo do que o extrato do
       depósito conta em detalhe. Guardado para o histórico não precisar cruzar as duas
       tabelas só para dizer "e o teclado ficou". */
    peripheralsLeftBehind: integer('peripherals_left_behind').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
  },
  (table) => [
    /* "Por onde esta máquina andou" é a consulta da ficha, do mais novo para o mais velho. */
    index('computer_transfers_computer_time_idx').on(table.computerId, table.createdAt.desc()),
    check(
      'computer_transfers_from_valid',
      sql`${table.fromDepartment} is null or ${table.fromDepartment} in (${valuesFor(DEPARTMENTS)})`,
    ),
    check(
      'computer_transfers_to_valid',
      sql`${table.toDepartment} is null or ${table.toDepartment} in (${valuesFor(DEPARTMENTS)})`,
    ),
    /* Sair e chegar no mesmo lugar é um evento que não aconteceu. O banco recusa aqui porque
       um histórico com linhas vazias é um histórico que ninguém confere. */
    check(
      'computer_transfers_real_move',
      sql`${table.fromDepartment} is distinct from ${table.toDepartment}`,
    ),
    check('computer_transfers_left_behind_not_negative', sql`${table.peripheralsLeftBehind} >= 0`),
  ],
);

export type ComputerTransferRow = typeof computerTransfers.$inferSelect;
export type ComputerTransferInsert = typeof computerTransfers.$inferInsert;
