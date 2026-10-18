import { Inject, Injectable } from '@nestjs/common';
import { BRASILIA_UTC_OFFSET_HOURS } from '@template/shared/domain/daily-schedule.util';
import {
  CLOSED_TICKET_STATUSES,
  SOLVED_TICKET_STATUSES,
} from '@template/shared/domain/ticket-status.util';
import { and, count, eq, gte, inArray, lt, sql, type SQL } from 'drizzle-orm';
import { type AnyPgColumn } from 'drizzle-orm/pg-core';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { softwareProjects } from '../../../lib/db/schema/software-projects.schema';
import { softwareTimelineEvents } from '../../../lib/db/schema/software-timeline-events.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';

/** Um período [início, fim) — o fim é o começo do próximo, para não perder o último segundo. */
export type Period = { start: Date; end: Date };

export type KeyCount = { key: string; count: number };

export type TicketMonthCounts = {
  opened: number;
  resolved: number;
  pending: number;
  averageResolutionHours: number | null;
};

export type PrMonthCounts = { opened: number; merged: number; total: number };

export type WeekCounts = {
  week: number;
  openedTickets: number;
  resolvedTickets: number;
  pullRequests: number;
};

/** As semanas do painel: 1–7, 8–14, 15–21 e 22 em diante (a última leva o resto do mês). */
export const DASHBOARD_WEEKS = 4;

/**
 * Em que semana do mês (1 a 4) cai um instante, contando o dia pelo calendário de Brasília.
 * Os dias 29, 30 e 31 entram na semana 4 — antes ficavam fora de todas.
 */
function weekOfMonth(column: AnyPgColumn): SQL<number> {
  /* Constantes NOSSAS escritas no SQL, e não parâmetros: com `$1` no select e `$8` no group by,
     o Postgres não reconhece as duas expressões como a mesma e recusa a consulta. */
  const offsetHours = sql.raw(String(BRASILIA_UTC_OFFSET_HOURS));
  const weeks = sql.raw(String(DASHBOARD_WEEKS));
  const localDay = sql`extract(day from (${column} at time zone 'UTC') + make_interval(hours => ${offsetHours}))`;
  return sql<number>`least(${weeks}, floor((${localDay} - 1) / 7) + 1)::int`;
}

/**
 * As contas do painel de Sistemas, feitas NO BANCO.
 *
 * Antes o painel trazia todos os chamados e eventos do mês para o servidor e contava um a um;
 * aqui cada número sai de uma consulta que já devolve o resultado. As regras de "resolvido" e
 * "encerrado" vêm do domínio (`ticket-status.util.ts`), não de uma lista escrita à mão no SQL.
 */
@Injectable()
export class SoftwareDashboardRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Quantos sistemas há em cada situação. */
  async projectsByStatus(): Promise<KeyCount[]> {
    return runQuery(
      this.db
        .select({ key: softwareProjects.status, count: count() })
        .from(softwareProjects)
        .groupBy(softwareProjects.status),
      'contar sistemas por situação',
    );
  }

  async ticketCounts(period: Period): Promise<TicketMonthCounts> {
    const solved = inArray(tickets.status, [...SOLVED_TICKET_STATUSES]);
    const [row] = await runQuery(
      this.db
        .select({
          opened: sql<number>`count(*)::int`,
          resolved: sql<number>`count(*) filter (where ${solved})::int`,
          pending: sql<number>`count(*) filter (where ${tickets.status} not in (${sql.join(
            CLOSED_TICKET_STATUSES.map((status) => sql`${status}`),
            sql`, `,
          )}))::int`,
          averageResolutionHours: sql<number | null>`
            avg(extract(epoch from (${tickets.resolvedAt} - ${tickets.createdAt})) / 3600)
              filter (where ${tickets.resolvedAt} is not null)
          `,
        })
        .from(tickets)
        .where(this.systemTicketsIn(period)),
      'contar chamados de sistema do mês',
    );

    return {
      opened: row?.opened ?? 0,
      resolved: row?.resolved ?? 0,
      pending: row?.pending ?? 0,
      averageResolutionHours:
        row?.averageResolutionHours == null ? null : Number(row.averageResolutionHours),
    };
  }

  async ticketsByProblemType(period: Period): Promise<KeyCount[]> {
    return runQuery(
      this.db
        .select({ key: tickets.problemType, count: count() })
        .from(tickets)
        .where(this.systemTicketsIn(period))
        .groupBy(tickets.problemType),
      'contar chamados de sistema por tipo',
    );
  }

  async pullRequestCounts(period: Period): Promise<PrMonthCounts> {
    const [row] = await runQuery(
      this.db
        .select({
          opened: sql<number>`count(*) filter (where ${softwareTimelineEvents.status} = 'open')::int`,
          merged: sql<number>`count(*) filter (where ${softwareTimelineEvents.status} = 'merged')::int`,
          total: sql<number>`count(*)::int`,
        })
        .from(softwareTimelineEvents)
        .where(this.pullRequestsIn(period)),
      'contar PRs do mês',
    );

    return { opened: row?.opened ?? 0, merged: row?.merged ?? 0, total: row?.total ?? 0 };
  }

  /** Chamados abertos, resolvidos e PRs de cada semana do mês — as semanas sem nada não vêm. */
  async weeklyCounts(period: Period): Promise<WeekCounts[]> {
    const ticketWeek = weekOfMonth(tickets.createdAt);
    const prWeek = weekOfMonth(softwareTimelineEvents.eventDate);
    const [ticketRows, prRows] = await Promise.all([
      runQuery(
        this.db
          .select({
            week: ticketWeek,
            opened: sql<number>`count(*)::int`,
            resolved: sql<number>`count(*) filter (where ${inArray(tickets.status, [...SOLVED_TICKET_STATUSES])})::int`,
          })
          .from(tickets)
          .where(this.systemTicketsIn(period))
          .groupBy(ticketWeek),
        'contar chamados de sistema por semana',
      ),
      runQuery(
        this.db
          .select({ week: prWeek, count: sql<number>`count(*)::int` })
          .from(softwareTimelineEvents)
          .where(this.pullRequestsIn(period))
          .groupBy(prWeek),
        'contar PRs por semana',
      ),
    ]);

    return Array.from({ length: DASHBOARD_WEEKS }, (_, index) => {
      const week = index + 1;
      const ticketRow = ticketRows.find((row) => row.week === week);
      return {
        week,
        openedTickets: ticketRow?.opened ?? 0,
        resolvedTickets: ticketRow?.resolved ?? 0,
        pullRequests: prRows.find((row) => row.week === week)?.count ?? 0,
      };
    });
  }

  private systemTicketsIn(period: Period): SQL | undefined {
    return and(
      eq(tickets.area, 'sistema'),
      gte(tickets.createdAt, period.start),
      lt(tickets.createdAt, period.end),
    );
  }

  private pullRequestsIn(period: Period): SQL | undefined {
    return and(
      eq(softwareTimelineEvents.type, 'pr'),
      gte(softwareTimelineEvents.eventDate, period.start),
      lt(softwareTimelineEvents.eventDate, period.end),
    );
  }
}
