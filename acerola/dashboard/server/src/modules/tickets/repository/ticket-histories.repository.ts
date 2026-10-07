import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  ticketHistories,
  type TicketHistoryInsert,
  type TicketHistoryRow,
} from '../../../lib/db/schema/ticket-histories.schema';
import { tickets, type TicketInsert } from '../../../lib/db/schema/tickets.schema';

/**
 * A linha do tempo de um chamado, no banco.
 *
 * **Não há `update` nem `delete` aqui, e a ausência é a regra.** Histórico não se corrige nem
 * se apaga: uma linha do tempo que se reescreve não prova nada. Sem os métodos, nenhum service
 * consegue fazer isso por engano.
 */
@Injectable()
export class TicketHistoriesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Do mais antigo para o mais novo: história se lê do começo. */
  async listByTicket(
    ticketId: number,
    options: { visibleToRequesterOnly?: boolean } = {},
  ): Promise<TicketHistoryRow[]> {
    const where = options.visibleToRequesterOnly
      ? and(eq(ticketHistories.ticketId, ticketId), eq(ticketHistories.isVisibleToRequester, true))
      : eq(ticketHistories.ticketId, ticketId);

    return runQuery(
      this.db
        .select()
        .from(ticketHistories)
        .where(where)
        .orderBy(asc(ticketHistories.createdAt), asc(ticketHistories.id)),
      'ler a linha do tempo do chamado',
    );
  }

  /**
   * Grava o histórico e, na MESMA transação, o que ele muda no chamado.
   *
   * Os dois juntos ou nenhum: um histórico de "Solução" gravado com o chamado ainda "em
   * atendimento" (ou o contrário) é exatamente a divergência que a linha do tempo existe para
   * impedir. `ticketChange` nulo é o histórico que só acrescenta — a abertura, por exemplo.
   */
  async record(
    history: TicketHistoryInsert,
    ticketChange: Partial<TicketInsert> | null = null,
  ): Promise<TicketHistoryRow> {
    return this.db.transaction(async (tx) => {
      const [row] = await runQuery(
        tx.insert(ticketHistories).values(history).returning(),
        'registrar o histórico do chamado',
      );
      if (!row) throw new Error('insert returned no ticket history row');

      if (ticketChange) {
        await runQuery(
          tx.update(tickets).set(ticketChange).where(eq(tickets.id, history.ticketId)),
          'mudar o estágio do chamado',
        );
      }

      return row;
    });
  }
}
