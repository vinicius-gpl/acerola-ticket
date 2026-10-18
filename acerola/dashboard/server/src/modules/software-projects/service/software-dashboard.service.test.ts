import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type SoftwareDashboardRepository } from '../repository/software-dashboard.repository';
import { type SoftwareTimelineRepository } from '../repository/software-timeline.repository';
import { SoftwareDashboardService } from './software-dashboard.service';

const user: RequestUser = {
  id: '1',
  email: 'dev@empresa.com.br',
  name: 'Dev User',
  role: 'user',
};

function makeService(overrides: Partial<SoftwareDashboardRepository> = {}) {
  const repository = {
    projectsByStatus: vi.fn().mockResolvedValue([
      { key: 'active', count: 12 },
      { key: 'maintenance', count: 3 },
      { key: 'deprecated', count: 1 },
    ]),
    ticketCounts: vi
      .fn()
      .mockResolvedValue({ opened: 8, resolved: 6, pending: 1, averageResolutionHours: 5.4567 }),
    ticketsByProblemType: vi.fn().mockResolvedValue([
      { key: 'bug', count: 5 },
      { key: 'novo_tipo', count: 3 },
    ]),
    pullRequestCounts: vi.fn().mockResolvedValue({ opened: 4, merged: 20, total: 26 }),
    weeklyCounts: vi.fn().mockResolvedValue(
      [1, 2, 3, 4].map((week) => ({
        week,
        openedTickets: week,
        resolvedTickets: week - 1,
        pullRequests: week * 2,
      })),
    ),
    ...overrides,
  } as unknown as SoftwareDashboardRepository;
  const timeline = {
    listRecent: vi.fn().mockResolvedValue([]),
  } as unknown as SoftwareTimelineRepository;

  return { service: new SoftwareDashboardService(repository, timeline), repository };
}

describe('SoftwareDashboardService', () => {
  // feliz
  it('assembles the month from the counts the database already computed', async () => {
    const { service } = makeService();

    const dashboard = await service.summary(user, new Date('2026-10-17T15:00:00Z'));

    expect(dashboard.monthYear).toBe('Outubro de 2026');
    expect(dashboard.projectsSummary).toEqual({
      total: 16,
      active: 12,
      maintenance: 3,
      deprecated: 1,
    });
    expect(dashboard.ticketsMonthSummary).toEqual({
      opened: 8,
      resolved: 6,
      pending: 1,
      resolutionRate: 75,
      averageResolutionHours: 5.5,
    });
    expect(dashboard.ticketsByProblemType).toEqual([
      { key: 'bug', label: 'Defeito / Bug', count: 5 },
      { key: 'novo_tipo', label: 'novo_tipo', count: 3 },
    ]);
    expect(dashboard.weeklyTrend[3]).toEqual({
      weekLabel: 'Semana 4',
      openedTickets: 4,
      resolvedTickets: 3,
      pullRequests: 8,
    });
  });

  // feliz
  /* O mês é o de Brasília: 22h do dia 31 ainda é outubro, mesmo já sendo novembro em UTC. */
  it('asks for the Brasília month, not the server one', async () => {
    const { service, repository } = makeService();

    await service.summary(user, new Date('2026-11-01T01:00:00Z'));

    expect(repository.ticketCounts).toHaveBeenCalledWith({
      start: new Date('2026-10-01T03:00:00Z'),
      end: new Date('2026-11-01T03:00:00Z'),
    });
  });

  // triste
  it('reports a full resolution rate and no average when nothing was opened', async () => {
    const { service } = makeService({
      ticketCounts: vi
        .fn()
        .mockResolvedValue({ opened: 0, resolved: 0, pending: 0, averageResolutionHours: null }),
      projectsByStatus: vi.fn().mockResolvedValue([]),
    });

    const dashboard = await service.summary(user);

    expect(dashboard.ticketsMonthSummary.resolutionRate).toBe(100);
    expect(dashboard.ticketsMonthSummary.averageResolutionHours).toBeNull();
    expect(dashboard.projectsSummary.total).toBe(0);
  });

  // triste
  it('refuses an unidentified request without touching the database', async () => {
    const { service, repository } = makeService();

    await expect(service.summary({ ...user, role: null } as unknown as RequestUser)).rejects.toThrow(
      ForbiddenException,
    );
    expect(repository.ticketCounts).not.toHaveBeenCalled();
  });
});
