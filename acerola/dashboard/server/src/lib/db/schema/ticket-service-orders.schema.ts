import { TICKET_STATUSES } from '@template/shared/domain/ticket-status.util';
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

import { tickets } from './tickets.schema';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * As ORDENS DE SERVIÇO EMITIDAS — uma linha por documento que saiu do sistema.
 *
 * **O PDF não é guardado.** Fica só a impressão digital dele (`file_hash`): conferir um arquivo
 * é calcular a impressão digital dele e comparar com esta. Um caractere alterado no arquivo
 * muda a impressão digital inteira.
 *
 * Como os históricos, uma emissão **não se edita nem se apaga**: um registro de "isto foi
 * emitido assim" que se reescreve não prova nada.
 */
export const ticketServiceOrders = pgTable(
  'ticket_service_orders',
  {
    id: serial('id').primaryKey(),

    /* `cascade`: chamado não se apaga neste sistema — é rede de segurança, como nos históricos. */
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),

    /* 1 na primeira emissão do chamado; sobe quando o chamado mudou desde a última. */
    version: integer('version').notNull(),

    /**
     * O código da emissão: 32 bytes aleatórios em hexadecimal. É ele que vai no link do
     * documento — e não o id, que é sequencial e deixaria qualquer um percorrer as emissões.
     */
    code: text('code').notNull(),

    /* A impressão digital (SHA-256, em hexadecimal) do arquivo emitido. */
    fileHash: text('file_hash').notNull(),

    /* O retrato do chamado no dia da emissão — o que a página pública mostra para conferir a
       olho. Gravado aqui porque o chamado segue mudando depois. */
    statusAtIssue: text('status_at_issue', { enum: TICKET_STATUSES }).notNull(),
    historyCount: integer('history_count').notNull(),
    totalMinutes: integer('total_minutes'),

    /* Quem emitiu: o nome daquele dia, como texto, e a identidade (e-mail) da sessão. */
    issuedByName: text('issued_by_name').notNull(),
    issuedBy: text('issued_by').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('ticket_service_orders_code_unique').on(table.code),
    /* Duas emissões ao mesmo tempo não podem virar a mesma versão. */
    uniqueIndex('ticket_service_orders_version_unique').on(table.ticketId, table.version),
    index('ticket_service_orders_hash_idx').on(table.fileHash),
    check('ticket_service_orders_version_positive', sql`${table.version} > 0`),
    check(
      'ticket_service_orders_status_valid',
      sql`${table.statusAtIssue} in (${valuesFor(TICKET_STATUSES)})`,
    ),
  ],
);

export type TicketServiceOrderRow = typeof ticketServiceOrders.$inferSelect;
export type TicketServiceOrderInsert = typeof ticketServiceOrders.$inferInsert;
