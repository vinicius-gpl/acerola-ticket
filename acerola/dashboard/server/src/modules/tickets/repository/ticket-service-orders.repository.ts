import { Inject, Injectable } from '@nestjs/common';
import { desc, eq, like } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  ticketServiceOrders,
  type TicketServiceOrderInsert,
  type TicketServiceOrderRow,
} from '../../../lib/db/schema/ticket-service-orders.schema';

/** Duas linhas bastam para saber se um código curto é de UMA emissão só. */
const AMBIGUITY_PROBE = 2;

/**
 * As ordens de serviço emitidas, no banco.
 *
 * **Não há `update` nem `delete` aqui, e a ausência é a regra** — a mesma dos históricos: o
 * registro de uma emissão que se reescreve não prova nada.
 */
@Injectable()
export class TicketServiceOrdersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** A emissão mais recente do chamado — a de maior versão. Nulo quando nunca houve uma. */
  async latestOf(ticketId: number): Promise<TicketServiceOrderRow | null> {
    return runMaybe(
      this.db
        .select()
        .from(ticketServiceOrders)
        .where(eq(ticketServiceOrders.ticketId, ticketId))
        .orderBy(desc(ticketServiceOrders.version))
        .limit(1),
      'ler a última ordem de serviço emitida',
    );
  }

  async record(issue: TicketServiceOrderInsert): Promise<TicketServiceOrderRow> {
    const [row] = await runQuery(
      this.db.insert(ticketServiceOrders).values(issue).returning(),
      'registrar a emissão da ordem de serviço',
    );
    if (!row) throw new Error('insert returned no ticket service order row');

    return row;
  }

  /**
   * As emissões cujo código COMEÇA pela referência — o código inteiro ou a versão curta dele.
   *
   * Devolve até duas: quem chama precisa distinguir "achei uma" de "esse começo serve para
   * mais de uma". A referência chega aqui já conferida (só hexadecimal), então não carrega
   * `%` nem `_` que mudariam o sentido do `like`.
   */
  async findByReference(reference: string): Promise<TicketServiceOrderRow[]> {
    return runQuery(
      this.db
        .select()
        .from(ticketServiceOrders)
        .where(like(ticketServiceOrders.code, `${reference}%`))
        .limit(AMBIGUITY_PROBE),
      'procurar a ordem de serviço pelo código',
    );
  }
}
