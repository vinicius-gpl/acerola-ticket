import { Injectable } from '@nestjs/common';
import { brasiliaMonthRange } from '@template/shared/domain/daily-schedule.util';
import { type SoftwareDashboard } from '@template/shared/schemas/software-dashboard.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import { toSoftwareTimelineEvent } from '../mapper/software-projects.mapper';
import {
  type KeyCount,
  SoftwareDashboardRepository,
} from '../repository/software-dashboard.repository';
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
    private readonly repository: SoftwareDashboardRepository,
    private readonly timelineRepository: SoftwareTimelineRepository,
  ) {}

  /**
   * O painel do mês corrente, no calendário de Brasília. As contas saem prontas do banco
   * (`SoftwareDashboardRepository`); aqui só se monta a resposta.
   */
  async summary(user: RequestUser, now = new Date()): Promise<SoftwareDashboard> {
    assertCanRead(user.role, 'o painel de sistemas');

    const { start, end, year, month } = brasiliaMonthRange(now);
    const period = { start, end };
    const monthName = MONTH_NAMES[month] ?? 'Mês Atual';

    const [projects, ticketCounts, byProblemType, prs, weeks, recentEvents] = await Promise.all([
      this.repository.projectsByStatus(),
      this.repository.ticketCounts(period),
      this.repository.ticketsByProblemType(period),
      this.repository.pullRequestCounts(period),
      this.repository.weeklyCounts(period),
      this.timelineRepository.listRecent(6),
    ]);

    const { opened, resolved, pending, averageResolutionHours } = ticketCounts;

    return {
      monthName,
      monthYear: `${monthName} de ${year}`,
      projectsSummary: {
        total: projects.reduce((total, row) => total + row.count, 0),
        active: countOf(projects, 'active'),
        maintenance: countOf(projects, 'maintenance'),
        deprecated: countOf(projects, 'deprecated'),
      },
      ticketsMonthSummary: {
        opened,
        resolved,
        pending,
        resolutionRate: opened > 0 ? Number(((resolved / opened) * 100).toFixed(1)) : 100,
        averageResolutionHours:
          averageResolutionHours === null ? null : Number(averageResolutionHours.toFixed(1)),
      },
      ticketsByProblemType: byProblemType.map(({ key, count }) => ({
        key,
        label: PROBLEM_TYPE_LABELS[key] ?? key,
        count,
      })),
      prsMonthSummary: prs,
      weeklyTrend: weeks.map((week) => ({
        weekLabel: `Semana ${week.week}`,
        openedTickets: week.openedTickets,
        resolvedTickets: week.resolvedTickets,
        pullRequests: week.pullRequests,
      })),
      recentTimeline: recentEvents.map((event) =>
        toSoftwareTimelineEvent(event, event.projectName ?? undefined),
      ),
    };
  }
}

function countOf(rows: readonly KeyCount[], key: string): number {
  return rows.find((row) => row.key === key)?.count ?? 0;
}
