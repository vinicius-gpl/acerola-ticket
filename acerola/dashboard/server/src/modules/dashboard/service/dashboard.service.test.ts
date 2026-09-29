import { ForbiddenException } from '@nestjs/common';
import { dashboardQuerySchema } from '@template/shared/schemas/dashboard.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type DashboardRepository, type MachineRow } from '../repository/dashboard.repository';
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
    recurringByPerson: vi.fn().mockResolvedValue([]),
    recurringByMachine: vi.fn().mockResolvedValue([]),
    heavyMaintenance: vi.fn().mockResolvedValue([]),
    peakingMachines: vi.fn().mockResolvedValue([]),
    maintenanceLog: vi.fn().mockResolvedValue([]),
    planCandidates: vi.fn().mockResolvedValue([]),
    ...repository,
  };

  return {
    service: new DashboardService(base as unknown as DashboardRepository),
    repository: base,
  };
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
      lastPreventiveByMachine: vi
        .fn()
        .mockResolvedValue([
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

describe('DashboardService.summary — os blocos do painel', () => {
  const ana: RequestUser = { id: '1', email: 'ana@azuos.com.br', name: 'Ana', role: 'user' };
  const query = { days: 30 };

  // feliz
  it('brings what is repeating, by person and by machine', async () => {
    const { service } = makeService({
      recurringByPerson: vi
        .fn()
        .mockResolvedValue([
          { requesterName: 'Bia', department: 'recepcao', problemType: 'printer', count: 4 },
        ]),
      recurringByMachine: vi
        .fn()
        .mockResolvedValue([
          { computerId: 3, computerName: 'CONTABIL-03', problemType: 'printer', count: 4 },
        ]),
    });

    const summary = await service.summary(ana, query);

    expect(summary.panels.recurringByPerson[0]?.count).toBe(4);
    expect(summary.panels.recurringByMachine[0]?.computerName).toBe('CONTABIL-03');
  });

  /* O `mode()` do Postgres devolve texto: só as três medidas conhecidas podem passar, senão a
     tela teria que saber lidar com um valor que ela não desenha. */
  it('keeps only a metric the screen knows how to draw', async () => {
    const { service } = makeService({
      peakingMachines: vi.fn().mockResolvedValue([
        { computerId: 1, computerName: 'A', today: 2, month: 5, topMetric: 'cpu' },
        { computerId: 2, computerName: 'B', today: 0, month: 1, topMetric: 'coisa-nova' },
      ]),
    });

    const summary = await service.summary(ana, query);

    expect(summary.panels.peaking[0]?.topMetric).toBe('cpu');
    expect(summary.panels.peaking[1]?.topMetric).toBeNull();
  });

  /* Uma consulta traz o mês; dia e semana são pedaços dela. É o que permite trocar de recorte
     na tela sem voltar ao banco. */
  it('splits the same month into day, week and month', async () => {
    const now = new Date();
    const { service } = makeService({
      maintenanceLog: vi.fn().mockResolvedValue([
        {
          id: 1,
          computerName: 'A',
          type: 'preventive',
          description: 'limpeza',
          performedBy: 'Ana',
          performedAt: now,
        },
        {
          id: 2,
          computerName: 'B',
          type: 'corrective',
          description: 'troca',
          performedBy: null,
          performedAt: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 1),
        },
      ]),
    });

    const summary = await service.summary(ana, query);

    expect(summary.panels.maintenanceLog.month).toHaveLength(2);
    expect(summary.panels.maintenanceLog.day.length).toBeLessThanOrEqual(2);
    expect(summary.panels.maintenanceByType.month.map((item) => item.key)).toContain('preventive');
    expect(summary.panels.doneToday).toBe(true);
  });

  // triste
  /* Descrição vazia não pode virar "null" escrito na tela. */
  it('turns a missing description into empty text', async () => {
    const { service } = makeService({
      maintenanceLog: vi.fn().mockResolvedValue([
        {
          id: 1,
          computerName: 'A',
          type: 'preventive',
          description: null,
          performedBy: null,
          performedAt: new Date(),
        },
      ]),
    });

    const summary = await service.summary(ana, query);

    expect(summary.panels.maintenanceLog.month[0]?.description).toBe('');
  });

  it('asks for nothing today when every machine is up to date', async () => {
    const { service } = makeService({
      planCandidates: vi
        .fn()
        .mockResolvedValue([
          { computerId: 1, computerName: 'A', department: null, lastDoneAt: new Date() },
        ]),
    });

    const summary = await service.summary(ana, query);

    expect(summary.panels.plannedToday).toEqual([]);
    expect(summary.panels.doneToday).toBe(false);
  });
});
