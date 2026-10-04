import { TICKET_HISTORY_TYPES } from '@template/shared/domain/ticket-history.util';
import { TICKET_STATUSES } from '@template/shared/domain/ticket-status.util';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { tickets } from './tickets.schema';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * Os HISTÓRICOS de um chamado — a linha do tempo da ordem de serviço.
 *
 * Cada linha é uma coisa que aconteceu: quem, quando, o quê e de que tipo. O chamado guarda o
 * estágio em que está, mas é o histórico que o leva até lá (ver `ticket-history.util`).
 *
 * **Não existe edição nem exclusão de histórico**, e a ausência é a regra: uma linha do tempo
 * que se reescreve não prova nada. Errou? Lance outro histórico corrigindo — os dois ficam.
 */
export const ticketHistories = pgTable(
  'ticket_histories',
  {
    id: serial('id').primaryKey(),

    /* `cascade`: chamado não se apaga neste sistema — é rede de segurança, como nos anexos. */
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),

    type: text('type', { enum: TICKET_HISTORY_TYPES }).notNull(),
    description: text('description').notNull(),

    /**
     * O estágio em que o chamado FICOU depois deste histórico, gravado junto com ele.
     *
     * É o que deixa a linha do tempo e o relatório dizerem "passou a aguardar peça em tal dia"
     * sem recalcular a história inteira — e continua certo mesmo se a regra de qual tipo leva
     * a qual estágio mudar depois.
     */
    statusAfter: text('status_after', { enum: TICKET_STATUSES }).notNull(),

    /* Quem abriu o chamado enxerga este histórico na consulta pública? O padrão é sim:
       esconder é a exceção, e tem de ser escolhida. */
    isVisibleToRequester: boolean('is_visible_to_requester').notNull().default(true),

    /* Tempo gasto neste passo, em minutos. Nulo quando ninguém informou — zero é outra coisa. */
    minutesSpent: integer('minutes_spent'),

    /**
     * O NOME de quem escreveu, guardado como texto.
     *
     * Na abertura é o nome que a pessoa digitou no formulário público (ela não tem conta); nos
     * demais, o nome de quem estava logado NAQUELE dia. Texto, e não um vínculo com o cadastro:
     * se a pessoa mudar de nome ou sair da empresa, o relatório de um chamado antigo continua
     * dizendo quem atendeu.
     */
    authorName: text('author_name').notNull(),
    /* A identidade (e-mail) de quem escreveu, quando há uma. Vem sempre da sessão. */
    createdBy: text('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    /* A consulta é sempre "a linha do tempo deste chamado", em ordem. */
    index('ticket_histories_ticket_idx').on(table.ticketId, table.createdAt),
    check('ticket_histories_type_valid', sql`${table.type} in (${valuesFor(TICKET_HISTORY_TYPES)})`),
    check(
      'ticket_histories_status_after_valid',
      sql`${table.statusAfter} in (${valuesFor(TICKET_STATUSES)})`,
    ),
    check(
      'ticket_histories_minutes_not_negative',
      sql`${table.minutesSpent} is null or ${table.minutesSpent} >= 0`,
    ),
  ],
);

export type TicketHistoryRow = typeof ticketHistories.$inferSelect;
export type TicketHistoryInsert = typeof ticketHistories.$inferInsert;
