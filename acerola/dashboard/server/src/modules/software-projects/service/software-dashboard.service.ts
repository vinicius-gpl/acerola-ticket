import { Inject, Injectable } from '@nestjs/common';
import { type SoftwareDashboard } from '@template/shared/schemas/software-dashboard.schema';
import { and, eq, gte, lte } from 'drizzle-orm';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { softwareProjects } from '../../../lib/db/schema/software-projects.schema';
import { softwareTimelineEvents } from '../../../lib/db/schema/software-timeline-events.schema';
import { tickets } from '../../../lib/db/schema/tickets.schema';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import { toSoftwareTimelineEvent } from '../mapper/software-projects.mapper';
import { SoftwareTimelineRepository } from '../repository/software-timeline.repository';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const PROBLEM_TYPE_LABELS: Record<string, string> = {
  bug: 'Defeito / Bug',
  feature_request: 'Nova Funcionalidade',
  access_request: 'Permissão / Acesso',
  data_correction: 'Correção de Dados',
  other: 'Outro',
};

@Injectable()
export class SoftwareDashboardService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly timelineRepository: SoftwareTimelineRepository,
  ) {}

  async summary(user: RequestUser): Promise<SoftwareDashboard> {
    assertCanRead(user.role, 'o painel de sistemas');

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const monthName = MONTH_NAMES[currentMonth] ?? 'Mês Atual';
    const monthYear = `${monthName} de ${currentYear}`;

    // 1. Sistemas
    const allProjects = await runQuery(
      this.db.select().from(softwareProjects),
      'buscar resumo de sistemas',
    );
    const projectsSummary = {
      total: allProjects.length,
      active: allProjects.filter((p) => p.status === 'active').length,
      maintenance: allProjects.filter((p) => p.status === 'maintenance').length,
      deprecated: allProjects.filter((p) => p.status === 'deprecated').length,
    };

    // 2. Chamados de Sistema no mês
    const systemTickets = await runQuery(
      this.db
        .select()
        .from(tickets)
        .where(
          and(
            eq(tickets.area, 'sistema'),
            gte(tickets.createdAt, monthStart),
            lte(tickets.createdAt, monthEnd),
          ),
        ),
      'buscar chamados de sistema no mês',
    );

    const opened = systemTickets.length;
    const resolved = systemTickets.filter((t) => t.status === 'resolved' || t.status === 'resolved_with_caveats').length;
    const pending = systemTickets.filter((t) => t.status !== 'resolved' && t.status !== 'resolved_with_caveats' && t.status !== 'cancelled').length;
    const resolutionRate = opened > 0 ? Number(((resolved / opened) * 100).toFixed(1)) : 100;

    // Tempo médio de resolução em horas
    const resolutionTimes = systemTickets
      .filter((t) => t.resolvedAt)
      .map((t) => (t.resolvedAt!.getTime() - t.createdAt.getTime()) / (1000 * 60 * 60));
    const averageResolutionHours =
      resolutionTimes.length > 0
        ? Number((resolutionTimes.reduce((acc, v) => acc + v, 0) / resolutionTimes.length).toFixed(1))
        : null;

    // Chamados por tipo de problema
    const typeCounts: Record<string, number> = {};
    for (const t of systemTickets) {
      typeCounts[t.problemType] = (typeCounts[t.problemType] ?? 0) + 1;
    }
    const ticketsByProblemType = Object.entries(typeCounts).map(([key, count]) => ({
      key,
      label: PROBLEM_TYPE_LABELS[key] ?? key,
      count,
    }));

    // 3. PRs do mês
    const monthEvents = await runQuery(
      this.db
        .select()
        .from(softwareTimelineEvents)
        .where(
          and(
            gte(softwareTimelineEvents.eventDate, monthStart),
            lte(softwareTimelineEvents.eventDate, monthEnd),
          ),
        ),
      'buscar eventos da timeline no mês',
    );
    const prEvents = monthEvents.filter((e) => e.type === 'pr');
    const prsMonthSummary = {
      opened: prEvents.filter((p) => p.status === 'open').length,
      merged: prEvents.filter((p) => p.status === 'merged').length,
      total: prEvents.length,
    };

    // 4. Tendência Semanal (dividido em 4 semanas)
    const weeklyTrend = [1, 2, 3, 4].map((week) => {
      const wStart = new Date(currentYear, currentMonth, (week - 1) * 7 + 1);
      const wEnd = new Date(currentYear, currentMonth, Math.min(week * 7, monthEnd.getDate()), 23, 59, 59);

      const wTickets = systemTickets.filter((t) => t.createdAt >= wStart && t.createdAt <= wEnd);
      const wResolved = wTickets.filter((t) => t.status === 'resolved' || t.status === 'resolved_with_caveats');
      const wPrs = prEvents.filter((p) => p.eventDate >= wStart && p.eventDate <= wEnd);

      return {
        weekLabel: `Semana ${week}`,
        openedTickets: wTickets.length,
        resolvedTickets: wResolved.length,
        pullRequests: wPrs.length,
      };
    });

    // 5. Atividades recentes
    const recentEvents = await this.timelineRepository.listRecent(6);
    const recentTimeline = recentEvents.map((e) =>
      toSoftwareTimelineEvent(e, e.projectName ?? undefined),
    );

    return {
      monthName,
      monthYear,
      projectsSummary,
      ticketsMonthSummary: {
        opened,
        resolved,
        pending,
        resolutionRate,
        averageResolutionHours,
      },
      ticketsByProblemType,
      prsMonthSummary,
      weeklyTrend,
      recentTimeline,
    };
  }
}
