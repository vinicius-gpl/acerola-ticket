import { QUOTE_KINDS, QUOTE_STATUSES } from '@template/shared/domain/maintenance-quote.util';
import { sql } from 'drizzle-orm';
import { check, date, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * OS ORÇAMENTOS DA MANUTENÇÃO: o que foi cotado com empresas de fora — produto, serviço ou o
 * que mais aparecer — com o documento que a empresa mandou e o que foi decidido.
 *
 * `amount_cents` é INTEIRO, em centavos: dinheiro em ponto flutuante perde centavo sozinho.
 *
 * `quoted_on` é `date`, sem hora: é o dia escrito no documento, e um dia não muda de acordo
 * com o fuso de quem lê — com `timestamp`, o orçamento do dia 5 apareceria como dia 4 à noite.
 *
 * `attachment_key` é o endereço do arquivo no R2, nunca um link: o link é assinado a cada
 * leitura e expira, como a foto do inventário.
 */
export const maintenanceQuotes = pgTable(
  'maintenance_quotes',
  {
    id: serial('id').primaryKey(),

    supplier: text('supplier').notNull(),
    description: text('description').notNull(),
    kind: text('kind', { enum: QUOTE_KINDS }).notNull(),
    amountCents: integer('amount_cents').notNull(),
    quotedOn: date('quoted_on', { mode: 'string' }).notNull(),
    status: text('status', { enum: QUOTE_STATUSES }).notNull().default('pending'),
    /* Quando saiu de "aguardando" — é por esta data que o painel soma o aprovado do mês. */
    decidedAt: timestamp('decided_at', { withTimezone: true, mode: 'date' }),
    note: text('note'),

    attachmentKey: text('attachment_key'),
    /* O nome que o arquivo tinha no computador de quem enviou: é por ele que a pessoa
       reconhece o documento na hora de baixar. */
    attachmentName: text('attachment_name'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    createdBy: text('created_by').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('maintenance_quotes_status_idx').on(table.status),
    index('maintenance_quotes_quoted_on_idx').on(table.quotedOn.desc()),
    check('maintenance_quotes_kind_valid', sql`${table.kind} in (${valuesFor(QUOTE_KINDS)})`),
    check(
      'maintenance_quotes_status_valid',
      sql`${table.status} in (${valuesFor(QUOTE_STATUSES)})`,
    ),
    check('maintenance_quotes_amount_not_negative', sql`${table.amountCents} >= 0`),
  ],
);

export type MaintenanceQuoteRow = typeof maintenanceQuotes.$inferSelect;
export type MaintenanceQuoteInsert = typeof maintenanceQuotes.$inferInsert;
