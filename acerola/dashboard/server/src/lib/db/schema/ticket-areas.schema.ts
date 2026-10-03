import { TICKET_AREAS } from '@template/shared/domain/ticket-catalog.util';
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

import { tickets } from './tickets.schema';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * As áreas PARTICIPANTES de um chamado (#13) — além da área original (`tickets.area`).
 *
 * Exemplo: um chamado nasceu em Infra, mas no meio do atendimento descobre-se que também
 * precisa de Manutenção. A área original não muda (ela é o que a pessoa escolheu ao abrir); a
 * de Manutenção entra aqui, como participante.
 *
 * Tabela própria, e não um array na própria linha do chamado: é a mesma forma de
 * `internal_roles` (entidade × contexto), e permite guardar quem somou a área e quando, sem
 * reinventar paginação para um array crescendo dentro de uma coluna.
 */
export const ticketAreas = pgTable(
  'ticket_areas',
  {
    id: serial('id').primaryKey(),
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),
    area: text('area', { enum: TICKET_AREAS }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    /** O e-mail de quem somou a área — sempre alguém do painel, nunca quem abriu o chamado. */
    createdBy: text('created_by'),
  },
  (table) => [
    /* A mesma área não pode ser somada duas vezes ao mesmo chamado. */
    uniqueIndex('ticket_areas_ticket_area_idx').on(table.ticketId, table.area),
    index('ticket_areas_ticket_idx').on(table.ticketId),
    check('ticket_areas_area_valid', sql`${table.area} in (${valuesFor(TICKET_AREAS)})`),
  ],
);

export type TicketAreaRow = typeof ticketAreas.$inferSelect;
export type TicketAreaInsert = typeof ticketAreas.$inferInsert;
