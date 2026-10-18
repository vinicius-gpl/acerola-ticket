import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { softwareProjects } from '../src/lib/db/schema/software-projects.schema';
import { softwareTimelineEvents } from '../src/lib/db/schema/software-timeline-events.schema';
import { tickets } from '../src/lib/db/schema/tickets.schema';
import { SoftwareDashboardRepository } from '../src/modules/software-projects/repository/software-dashboard.repository';
import { createE2eApp, type E2eApp } from './support/e2e-app.util';

/**
 * As contas do painel de Sistemas, feitas pelo Postgres de verdade.
 *
 * O que só quebra aqui: os `count(*) filter`, a média de horas e, principalmente, a semana do
 * mês calculada no fuso de Brasília — um chamado das 22h do dia 31 é de outubro, mesmo já sendo
 * novembro em UTC. O repositório falso do teste de unidade não exercita nada disso.
 *
 * Sem `TEST_DATABASE_URL` a suíte é pulada, e não falha.
 */
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

/** Outubro de 2026 no calendário de Brasília. */
const OCTOBER = {
  start: new Date('2026-10-01T03:00:00Z'),
  end: new Date('2026-11-01T03:00:00Z'),
};

describe.skipIf(!testDatabaseUrl)('Software dashboard counts (e2e)', () => {
  let started: E2eApp;
  let repository: SoftwareDashboardRepository;
  let projectId: number;

  const ticket = (createdAt: string, overrides: Record<string, unknown> = {}) => ({
    requesterName: 'Pessoa de Teste',
    area: 'sistema' as const,
    department: 'comercial' as const,
    problemType: 'bug' as const,
    description: 'Tela não abre.',
    createdAt: new Date(createdAt),
    ...overrides,
  });

  const pr = (externalId: string, eventDate: string, status: 'open' | 'merged' | 'closed') => ({
    projectId,
    type: 'pr' as const,
    externalId,
    title: `PR ${externalId}`,
    status,
    eventDate: new Date(eventDate),
    createdBy: 'sistema@acerola.local',
  });

  beforeAll(async () => {
    started = await createE2eApp(testDatabaseUrl!);
    repository = new SoftwareDashboardRepository(started.db);
  });

  beforeEach(async () => {
    await started.truncate('tickets', 'software_timeline_events', 'software_projects');
    const [project] = await started.db
      .insert(softwareProjects)
      .values([
        { name: 'Chamados', repositoryUrl: 'org/a', status: 'active', createdBy: 'ti@empresa.com.br' },
        { name: 'Legado', repositoryUrl: 'org/b', status: 'deprecated', createdBy: 'ti@empresa.com.br' },
      ])
      .returning();
    projectId = project!.id;
  });

  afterAll(async () => {
    await started.app.close();
  });

  // feliz
  it('counts the month tickets by situation, with the average resolution time', async () => {
    await started.db.insert(tickets).values([
      ticket('2026-10-02T12:00:00Z', {
        status: 'resolved',
        resolvedAt: new Date('2026-10-02T16:00:00Z'),
      }),
      ticket('2026-10-03T12:00:00Z', {
        status: 'resolved_with_caveats',
        resolvedAt: new Date('2026-10-03T14:00:00Z'),
      }),
      ticket('2026-10-04T12:00:00Z', { status: 'cancelled' }),
      ticket('2026-10-05T12:00:00Z', { status: 'open', problemType: 'feature_request' }),
      /* Fora: outra área e outro mês. */
      ticket('2026-10-05T12:00:00Z', { area: 'infra', problemType: 'printer' }),
      ticket('2026-09-30T12:00:00Z'),
    ]);

    expect(await repository.ticketCounts(OCTOBER)).toEqual({
      opened: 4,
      resolved: 2,
      pending: 1,
      averageResolutionHours: 3,
    });
    expect(
      (await repository.ticketsByProblemType(OCTOBER)).sort((a, b) => a.key.localeCompare(b.key)),
    ).toEqual([
      { key: 'bug', count: 3 },
      { key: 'feature_request', count: 1 },
    ]);
  });

  // feliz
  it('counts the projects by situation and the pull requests of the month', async () => {
    await started.db
      .insert(softwareTimelineEvents)
      .values([
        pr('#1', '2026-10-02T12:00:00Z', 'merged'),
        pr('#2', '2026-10-03T12:00:00Z', 'merged'),
        pr('#3', '2026-10-04T12:00:00Z', 'open'),
        pr('#4', '2026-09-20T12:00:00Z', 'merged'),
      ]);

    expect(await repository.pullRequestCounts(OCTOBER)).toEqual({ opened: 1, merged: 2, total: 3 });
    expect(
      (await repository.projectsByStatus()).sort((a, b) => a.key.localeCompare(b.key)),
    ).toEqual([
      { key: 'active', count: 1 },
      { key: 'deprecated', count: 1 },
    ]);
  });

  // triste
  /* Dia 31 às 22h em Brasília (1º/11 em UTC) é da semana 4 de outubro; dia 29 também. */
  it('puts the last days of the month in week 4, on the Brasília calendar', async () => {
    await started.db.insert(tickets).values([
      ticket('2026-10-01T03:30:00Z'),
      ticket('2026-10-29T15:00:00Z'),
      ticket('2026-11-01T01:00:00Z', { status: 'resolved', resolvedAt: new Date('2026-11-01T02:00:00Z') }),
    ]);
    await started.db.insert(softwareTimelineEvents).values([pr('#9', '2026-10-15T12:00:00Z', 'merged')]);

    const weeks = await repository.weeklyCounts(OCTOBER);

    expect(weeks).toEqual([
      { week: 1, openedTickets: 1, resolvedTickets: 0, pullRequests: 0 },
      { week: 2, openedTickets: 0, resolvedTickets: 0, pullRequests: 0 },
      { week: 3, openedTickets: 0, resolvedTickets: 0, pullRequests: 1 },
      { week: 4, openedTickets: 2, resolvedTickets: 1, pullRequests: 0 },
    ]);
  });

  // triste
  it('answers zeros, not errors, for an empty month', async () => {
    expect(await repository.ticketCounts(OCTOBER)).toEqual({
      opened: 0,
      resolved: 0,
      pending: 0,
      averageResolutionHours: null,
    });
    expect(await repository.pullRequestCounts(OCTOBER)).toEqual({ opened: 0, merged: 0, total: 0 });
  });
});
