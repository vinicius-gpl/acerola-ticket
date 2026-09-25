import { ForbiddenException } from '@nestjs/common';
import { insightQuerySchema } from '@template/shared/schemas/insight.schema';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import {
  type HardwareRow,
  type InsightsRepository,
  type TroubleRow,
  type UsageRow,
} from '../repository/insights.repository';
import { InsightsService } from './insights.service';

const ana: RequestUser = { id: '1', email: 'ana@empresa.com.br', name: 'Ana', role: 'user' };

/* Identidade PELA METADE: chegou sem papel. O contrato não admite, e é por isso que o teste
   precisa forçar — a recusa existe justamente para o que não devia chegar. */
const noRole = { ...ana, role: undefined } as unknown as RequestUser;

const GB = 1024 ** 3;

function usageRow(over: Partial<UsageRow> = {}): UsageRow {
  return {
    computerId: 1,
    computerName: 'RECEPCAO-01',
    computerDisplayName: 'Recepção — balcão',
    department: 'recepcao',
    averageCpuPercent: 20,
    averageMemoryPercent: 50,
    sampleCount: 288,
    activeAlerts: 0,
    ...over,
  };
}

function hardwareRow(over: Partial<HardwareRow> = {}): HardwareRow {
  return {
    computerId: 1,
    computerName: 'RECEPCAO-01',
    computerDisplayName: 'Recepção — balcão',
    department: 'recepcao',
    healthScore: 100,
    healthStatus: 'good',
    totalMemoryBytes: 16 * GB,
    totalDiskBytes: 480 * GB,
    freeDiskBytes: 240 * GB,
    cpuModel: 'Intel Core i5-12400',
    lastSeenAt: new Date('2026-09-23T12:00:00.000Z'),
    ...over,
  };
}

function troubleRow(over: Partial<TroubleRow> = {}): TroubleRow {
  return {
    computerId: 1,
    computerName: 'RECEPCAO-01',
    computerDisplayName: 'Recepção — balcão',
    department: 'recepcao',
    maintenanceCount: 0,
    alertCount: 0,
    lastMaintenanceAt: null,
    ...over,
  };
}

function makeService(repository: Partial<InsightsRepository> = {}) {
  const base = {
    usage: vi.fn().mockResolvedValue([]),
    hardware: vi.fn().mockResolvedValue([]),
    trouble: vi.fn().mockResolvedValue([]),
    ...repository,
  };

  return {
    service: new InsightsService(base as unknown as InsightsRepository),
    repository: base,
  };
}

const query = (overrides: Record<string, unknown> = {}) => insightQuerySchema.parse(overrides);

describe('InsightsService.summary', () => {
  // feliz
  it('points out the machine living near the ceiling, worst first', async () => {
    const { service } = makeService({
      usage: vi.fn().mockResolvedValue([
        usageRow({ computerId: 1, computerName: 'CALMA-01' }),
        usageRow({ computerId: 2, computerName: 'CHEIA-02', averageMemoryPercent: 92 }),
        usageRow({ computerId: 3, computerName: 'PESADA-03', averageCpuPercent: 95 }),
      ]),
    });

    const insights = await service.summary(ana, query());

    expect(insights.overloaded.map((row) => row.computerName)).toEqual([
      'PESADA-03',
      'CHEIA-02',
    ]);
  });

  it('recommends memory for the machine with four gigabytes', async () => {
    const { service } = makeService({
      hardware: vi.fn().mockResolvedValue([hardwareRow({ totalMemoryBytes: 4 * GB })]),
    });

    const [upgrade] = (await service.summary(ana, query())).upgrades;

    expect(upgrade?.reason).toBe('memory');
    expect(upgrade?.value).toBe(4);
  });

  it('lists the spare machines, the best one first', async () => {
    const { service } = makeService({
      hardware: vi.fn().mockResolvedValue([
        hardwareRow({ computerId: 1, computerName: 'RESERVA-FRACA', department: null, totalMemoryBytes: 8 * GB }),
        hardwareRow({ computerId: 2, computerName: 'RESERVA-BOA', department: null, totalMemoryBytes: 16 * GB }),
        hardwareRow({ computerId: 3, computerName: 'EM-USO', department: 'rh' }),
      ]),
    });

    const insights = await service.summary(ana, query());

    expect(insights.spares.map((row) => row.computerName)).toEqual([
      'RESERVA-BOA',
      'RESERVA-FRACA',
    ]);
  });

  it('counts the work each machine gave, maintenance weighing more', async () => {
    const { service } = makeService({
      trouble: vi.fn().mockResolvedValue([
        troubleRow({ computerId: 1, computerName: 'TRANQUILA-01', maintenanceCount: 1 }),
        troubleRow({ computerId: 2, computerName: 'TRABALHOSA-02', maintenanceCount: 4, alertCount: 2 }),
      ]),
    });

    const insights = await service.summary(ana, query());

    expect(insights.troublesome.map((row) => row.computerName)).toEqual(['TRABALHOSA-02']);
  });

  // triste
  /* Um pico não é sobrecarga, e poucas leituras não viram média. */
  it('leaves a machine with barely any reading out of the overloaded list', async () => {
    const { service } = makeService({
      usage: vi.fn().mockResolvedValue([usageRow({ averageCpuPercent: 99, sampleCount: 3 })]),
    });

    expect((await service.summary(ana, query())).overloaded).toEqual([]);
  });

  /* Máquina sem medição não recebe recomendação: sugerir memória para um computador cujo
     agente nunca conectou seria inventar. */
  it('recommends nothing for a machine that never reported', async () => {
    const { service } = makeService({
      hardware: vi
        .fn()
        .mockResolvedValue([
          hardwareRow({ totalMemoryBytes: null, totalDiskBytes: null, freeDiskBytes: null }),
        ]),
    });

    expect((await service.summary(ana, query())).upgrades).toEqual([]);
  });

  it('answers empty lists for a park with nothing wrong', async () => {
    const { service } = makeService({
      usage: vi.fn().mockResolvedValue([usageRow()]),
      hardware: vi.fn().mockResolvedValue([hardwareRow()]),
      trouble: vi.fn().mockResolvedValue([troubleRow()]),
    });

    const insights = await service.summary(ana, query());

    expect(insights.overloaded).toEqual([]);
    expect(insights.upgrades).toEqual([]);
    expect(insights.troublesome).toEqual([]);
    expect(insights.spares).toEqual([]);
  });

  it('refuses an unidentified request without touching the repository', async () => {
    const { service, repository } = makeService();

    await expect(service.summary(noRole, query())).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.usage).not.toHaveBeenCalled();
  });
});
