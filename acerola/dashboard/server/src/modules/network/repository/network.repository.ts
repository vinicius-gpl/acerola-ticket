import { Inject, Injectable } from '@nestjs/common';
import { type NetworkEventListQuery } from '@template/shared/schemas/network-event.schema';
import { and, count, desc, eq, gte, isNull, sql, type SQL } from 'drizzle-orm';

import { runMaybe, runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import {
  networkEvents,
  type NetworkEventInsert,
  type NetworkEventRow,
} from '../../../lib/db/schema/network-events.schema';

export type NetworkEventPage = { rows: NetworkEventRow[]; total: number };

export type NetworkTotals = {
  open: number;
  outages: number;
  totalOutageSeconds: number | null;
  worstLatencyMs: number | null;
  worstPacketLossPercent: number | null;
};

/**
 * O repository não tem regra: traduz filtro em consulta e devolve linha.
 *
 * Toda consulta passa por `runQuery`/`runMaybe`: é o que faz a recusa do banco chegar à tela
 * com status e motivo, em vez de "erro inesperado".
 */
@Injectable()
export class NetworkRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async list(query: NetworkEventListQuery): Promise<NetworkEventPage> {
    const where = buildWhere(query);
    const offset = (query.page - 1) * query.pageSize;

    const [rows, [counted]] = await Promise.all([
      runQuery(
        this.db
          .select()
          .from(networkEvents)
          .where(where)
          /* A mais recente primeiro: quem abre a tela quer saber o que houve agora. */
          .orderBy(desc(networkEvents.occurredAt), desc(networkEvents.id))
          .limit(query.pageSize)
          .offset(offset),
        'listar eventos de rede',
      ),
      runQuery(
        this.db.select({ total: count() }).from(networkEvents).where(where),
        'contar eventos de rede',
      ),
    ]);

    return { rows, total: counted?.total ?? rows.length };
  }

  async findById(id: number): Promise<NetworkEventRow | null> {
    return runMaybe(
      this.db.select().from(networkEvents).where(eq(networkEvents.id, id)).limit(1),
      'ler evento de rede',
    );
  }

  async insert(values: NetworkEventInsert): Promise<NetworkEventRow> {
    const [row] = await runQuery(
      this.db.insert(networkEvents).values(values).returning(),
      'registrar evento de rede',
    );

    return row as NetworkEventRow;
  }

  async update(id: number, values: Partial<NetworkEventInsert>): Promise<NetworkEventRow> {
    const [row] = await runQuery(
      this.db.update(networkEvents).set(values).where(eq(networkEvents.id, id)).returning(),
      'salvar evento de rede',
    );

    return row as NetworkEventRow;
  }

  /**
   * Os números do período, em uma consulta só.
   *
   * O tempo fora do ar soma só os episódios de QUEDA que já terminaram: uma queda em aberto
   * não tem duração ainda, e contá-la como zero faria o total mentir para menos justamente
   * quando a internet está fora agora.
   */
  async totals(since: Date): Promise<NetworkTotals> {
    const [row] = await runQuery(
      this.db
        .select({
          open: sql<number>`count(*) filter (where ${networkEvents.resolvedAt} is null)::int`,
          outages: sql<number>`count(*) filter (where ${networkEvents.type} = 'wan_down' and ${networkEvents.occurredAt} >= ${since})::int`,
          totalOutageSeconds: sql<number | null>`
            sum(extract(epoch from (${networkEvents.resolvedAt} - ${networkEvents.occurredAt})))
              filter (where ${networkEvents.type} = 'wan_down' and ${networkEvents.occurredAt} >= ${since})
          `,
          worstLatencyMs: sql<number | null>`max(${networkEvents.latencyMs}) filter (where ${networkEvents.occurredAt} >= ${since})`,
          worstPacketLossPercent: sql<number | null>`max(${networkEvents.packetLossPercent}) filter (where ${networkEvents.occurredAt} >= ${since})`,
        })
        .from(networkEvents),
      'resumir a rede do período',
    );

    return toTotals(row);
  }
}

type TotalsRow = {
  open: number;
  outages: number;
  totalOutageSeconds: number | null;
  worstLatencyMs: number | null;
  worstPacketLossPercent: number | null;
};

const NO_EVENTS: NetworkTotals = {
  open: 0,
  outages: 0,
  totalOutageSeconds: null,
  worstLatencyMs: null,
  worstPacketLossPercent: null,
};

/**
 * A linha do banco virando números.
 *
 * O Postgres devolve `numeric` como TEXTO; sem o `Number` o tempo fora do ar chegaria à tela
 * como string e a formatação quebraria.
 */
function toTotals(row: TotalsRow | undefined): NetworkTotals {
  if (!row) return NO_EVENTS;

  return {
    open: row.open,
    outages: row.outages,
    totalOutageSeconds: toNumber(row.totalOutageSeconds),
    worstLatencyMs: toNumber(row.worstLatencyMs),
    worstPacketLossPercent: toNumber(row.worstPacketLossPercent),
  };
}

/** Nulo continua nulo: zero diria "medi e deu zero", que é outra coisa. */
function toNumber(value: number | null): number | null {
  return value === null ? null : Number(value);
}

function buildWhere(query: NetworkEventListQuery): SQL | undefined {
  const filters: (SQL | undefined)[] = [];

  if (query.type) filters.push(eq(networkEvents.type, query.type));
  if (query.severity) filters.push(eq(networkEvents.severity, query.severity));
  if (query.onlyOpen) filters.push(isNull(networkEvents.resolvedAt));
  if (query.days) {
    filters.push(gte(networkEvents.occurredAt, new Date(Date.now() - query.days * 86_400_000)));
  }

  return and(...filters.filter((filter): filter is SQL => filter !== undefined));
}
