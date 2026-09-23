import { MAINTENANCE_TYPES } from '@template/shared/domain/maintenance.util';
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

import { computers } from './computers.schema';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * O HISTÓRICO de manutenção: o que já foi feito em cada equipamento.
 *
 * **O nome da máquina não é copiado para cá.** A linha aponta para o inventário, e o nome sai
 * de lá a cada consulta: uma máquina renomeada aparece com o nome novo em todo o histórico
 * dela. Guardando cópia, o passado passaria a falar de um equipamento que ninguém reconhece —
 * foi o que aconteceu no sistema antigo, que precisou de uma função só para reconciliar isso.
 *
 * **`other_machine` existe para o que não está no inventário**: o notebook velho da recepção,
 * uma impressora. Sem essa saída, o técnico registraria o serviço numa máquina errada só para
 * conseguir salvar — e o histórico daquela máquina passaria a mentir.
 *
 * `restrict` na máquina, e não `cascade`: um computador não se apaga (ele é arquivado), e se
 * algum dia alguém apagar um, o banco recusa antes de levar junto a prova de que a empresa
 * gastou três manutenções naquele equipamento.
 */
export const maintenances = pgTable(
  'maintenances',
  {
    id: serial('id').primaryKey(),

    computerId: integer('computer_id').references(() => computers.id, { onDelete: 'restrict' }),
    otherMachine: text('other_machine'),

    type: text('type', { enum: MAINTENANCE_TYPES }).notNull(),
    description: text('description'),
    /* Texto livre: quem fez pode ser alguém de fora da empresa, que não tem login aqui. */
    performedBy: text('performed_by'),
    /* QUANDO O SERVIÇO FOI FEITO — diferente de `created_at`, que é quando alguém digitou.
       Manutenção lançada na segunda-feira sobre o sábado é o caso comum, não a exceção. */
    performedAt: timestamp('performed_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    /* "O que já fizeram nesta máquina" é a consulta da ficha do computador. */
    index('maintenances_computer_idx').on(table.computerId),
    /* A lista abre pela mais recente, sempre. */
    index('maintenances_performed_at_idx').on(table.performedAt.desc()),
    index('maintenances_type_idx').on(table.type),
    check('maintenances_type_valid', sql`${table.type} in (${valuesFor(MAINTENANCE_TYPES)})`),
    /* A REGRA DE UNICIDADE DO REGISTRO MORA NO BANCO: ou é uma máquina do inventário, ou é um
       equipamento nomeado à mão. Linha sem nenhum dos dois não responde "de quem é isto?", e
       validar só na tela deixaria passar tudo que entrasse por seed ou por script. */
    check(
      'maintenances_machine_required',
      sql`${table.computerId} is not null or ${table.otherMachine} is not null`,
    ),
  ],
);

export type MaintenanceRow = typeof maintenances.$inferSelect;
export type MaintenanceInsert = typeof maintenances.$inferInsert;
