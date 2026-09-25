import { ForbiddenException } from '@nestjs/common';
import { dashboardQuerySchema } from '@template/shared/schemas/dashboard.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  type DashboardRepository,
  type MachineRow,
} from '../repository/dashboard.repository';
import { DashboardService } from './dashboard.service';

const ana: RequestUser = { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'user' };

/* Identidade PELA METADE: chegou sem papel. O contrato não admite, e é por isso que o teste
   precisa forçar — a recusa existe justamente para o que não devia chegar. */
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

const DAY = 24 * 60 * 60 * 1000;

function machineRow(over: Partial<MachineRow> = {}): MachineRow {
  return {
    computerId: 1,
    computerName: 'RECEPCAO-01',
    computerDisplayName: 'Recepção — balcão',
    department: 'recepcao',
    healthScore: 100,
    healthStatus: 'good',
    activeAlerts: 0,
    maintenanceCount: 0,
    ...over,
  };
}

/** O repository fingido: por padrão, um parque saudável e vazio de problemas. */
function makeService(repository: Partial<DashboardRepository> = {}) {
  const base = {
    healthCounts: vi.fn().mockResolvedValue([{ key: 'good', count: 3 }]),
    neverSeenCount: vi.fn().mockResolvedValue(0),
    ticketCounts: vi.fn().mockResolvedValue({
      open: 0,
      inProgress: 0,
      openedInPeriod: 0,
      resolvedInPeriod: 0,
      averageResolutionHours: null,
    }),
    ticketsByProblemType: vi.fn().mockResolvedValue([]),
    ticketsByDepartment: vi.fn().mockResolvedValue([]),
    maintenancesInPeriod: vi.fn().mockResolvedValue(0),
    partsSummary: vi.fn().mockResolvedValue({ kinds: 0, items: 0, outOfStock: 0 }),
    machinesWithProblems: vi.fn().mockResolvedValue([]),
    lastPreventiveByMachine: vi.fn().mockResolvedValue([]),
    ...repository,
  };

  return { service: new DashboardService(base as unknown as DashboardRepository), repository: base };
}

const query = (overrides: Record<string, unknown> = {}) => dashboardQuerySchema.parse(overrides);

describe('DashboardService.summary', () => {
  // feliz
  it('answers for the last thirty days when nobody asked for a period', async () => {
    const { service, repository } = makeService();

    const summary = await service.summary(ana, query());

    expect(summary.days).toBe(30);
    /* O recorte chega ao banco como uma data, e é a mesma em todas as perguntas. */
    const [since] = vi.mocked(repository.ticketCounts).mock.calls[0]!;
    expect(Date.now() - since.getTime()).toBeGreaterThan(29 * DAY);
  });

  it('adds up the park from the health counts', async () => {
    const { service } = makeService({
      healthCounts: vi.fn().mockResolvedValue([
        { key: 'good', count: 4 },
        { key: 'attention', count: 2 },
        { key: 'critical', count: 1 },
      ]),
      neverSeenCount: vi.fn().mockResolvedValue(3),
    });

    const summary = await service.summary(ana, query());

    expect(summary.park).toEqual({ total: 7, critical: 1, attention: 2, neverSeen: 3 });
  });

  /* O mapa é dos problemas: a máquina saudável não entra, e a pior vem primeiro. */
  it('puts the worst machine first and leaves the healthy ones out', async () => {
    const { service } = makeService({
      machinesWithProblems: vi.fn().mockResolvedValue([
        machineRow({ computerId: 1, computerName: 'SAUDAVEL-01' }),
        machineRow({
          computerId: 2,
          computerName: 'ATENCAO-02',
          healthStatus: 'attention',
          healthScore: 88,
        }),
        machineRow({
          computerId: 3,
          computerName: 'CRITICA-03',
          healthStatus: 'critical',
          healthScore: 63,
          activeAlerts: 1,
        }),
      ]),
    });

    const summary = await service.summary(ana, query());

    expect(summary.worstMachines.map((machine) => machine.computerName)).toEqual([
      'CRITICA-03',
      'ATENCAO-02',
    ]);
  });

  it('counts the machines past the preventive deadline', async () => {
    const { service } = makeService({
      lastPreventiveByMachine: vi.fn().mockResolvedValue([
        { lastDoneAt: new Date(Date.now() - 20 * DAY) },
        { lastDoneAt: new Date(Date.now() - 150 * DAY) },
        { lastDoneAt: null },
      ]),
    });

    const summary = await service.summary(ana, query());

    expect(summary.maintenance.preventiveDue).toBe(2);
  });

  // triste
  /* Parque inteiro saudável não é uma falha: o mapa vem vazio, e a tela diz a boa notícia. */
  it('returns an empty map when nothing is wrong', async () => {
    const { service } = makeService();

    const summary = await service.summary(ana, query());

    expect(summary.worstMachines).toEqual([]);
  });

  /* Nada resolvido no período: nulo, e não zero — zero anunciaria atendimento instantâneo. */
  it('keeps the average empty when nothing was resolved in the period', async () => {
    const { service } = makeService();

    const summary = await service.summary(ana, query());

    expect(summary.tickets.averageResolutionHours).toBeNull();
  });

  it('refuses an unidentified request without touching the repository', async () => {
    const { service, repository } = makeService();

    await expect(service.summary(noRole, query())).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.healthCounts).not.toHaveBeenCalled();
  });
});
