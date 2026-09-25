import { Injectable } from '@nestjs/common';
import { type Department } from '@template/shared/domain/department.util';
import {
  isOverloaded,
  isTroublesome,
  overloadScore,
  troubleScore,
  upgradeReasonOf,
} from '@template/shared/domain/insight-rules.util';
import {
  type InsightQuery,
  type Insights,
  type OverloadedMachine,
  type SpareMachine,
  type TroublesomeMachine,
  type UpgradeCandidate,
} from '@template/shared/schemas/insight.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import {
  InsightsRepository,
  type HardwareRow,
  type TroubleRow,
  type UsageRow,
} from '../repository/insights.repository';

/** Quantas máquinas cada lista mostra. Mais que isso vira relatório, não recomendação. */
const LIST_LIMIT = 8;

const BYTES_PER_GB = 1024 ** 3;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * A Inteligência: o que os dados juntos dizem.
 *
 * As três consultas saem JUNTAS (`Promise.all`) — são independentes, e enfileirá-las só
 * deixaria a tela mais lenta.
 *
 * As RÉGUAS não estão aqui: elas moram no domínio (`insight-rules.util`), com teste. Este
 * service junta os dados, aplica a régua e ordena — nenhuma decisão de produto é escrita em
 * SQL, onde nenhum teste a alcançaria.
 */
@Injectable()
export class InsightsService {
  constructor(private readonly repository: InsightsRepository) {}

  async summary(user: RequestUser, query: InsightQuery): Promise<Insights> {
    assertCanRead(user.role, 'a inteligência do parque');

    const since = new Date(Date.now() - query.days * MILLISECONDS_PER_DAY);

    const [usage, hardware, trouble] = await Promise.all([
      this.repository.usage(since),
      this.repository.hardware(),
      this.repository.trouble(since),
    ]);

    return {
      days: query.days,
      overloaded: toOverloaded(usage),
      upgrades: toUpgrades(hardware),
      troublesome: toTroublesome(trouble),
      spares: toSpares(hardware),
    };
  }
}

function machineOf(row: {
  computerId: number;
  computerName: string;
  computerDisplayName: string | null;
  department: string | null;
}) {
  return {
    computerId: row.computerId,
    computerName: row.computerName,
    computerDisplayName: row.computerDisplayName,
    department: (row.department as Department | null) ?? null,
  };
}

/** Média em número, não em texto: o Postgres devolve `avg` como `numeric`, que vem string. */
function averageOf(value: number | null): number {
  return value === null ? 0 : Math.round(Number(value) * 10) / 10;
}

function toOverloaded(rows: readonly UsageRow[]): OverloadedMachine[] {
  return rows
    .map((row) => ({
      ...machineOf(row),
      averageCpuPercent: averageOf(row.averageCpuPercent),
      averageMemoryPercent: averageOf(row.averageMemoryPercent),
      sampleCount: row.sampleCount,
      activeAlerts: row.activeAlerts,
    }))
    .filter(isOverloaded)
    .sort((a, b) => overloadScore(b) - overloadScore(a))
    .slice(0, LIST_LIMIT);
}

/** O espaço livre em porcentagem, ou nada quando o agente não mediu o disco. */
function diskFreePercentOf(row: HardwareRow): number | null {
  if (!row.totalDiskBytes || row.freeDiskBytes === null) return null;

  return (row.freeDiskBytes / row.totalDiskBytes) * 100;
}

function memoryGbOf(row: HardwareRow): number | null {
  return row.totalMemoryBytes === null ? null : row.totalMemoryBytes / BYTES_PER_GB;
}

function toUpgrades(rows: readonly HardwareRow[]): UpgradeCandidate[] {
  return rows
    .map((row) => {
      const memoryGb = memoryGbOf(row);
      const diskFreePercent = diskFreePercentOf(row);
      const reason = upgradeReasonOf({ memoryGb, diskFreePercent });
      if (!reason) return null;

      return {
        ...machineOf(row),
        reason,
        /* O número que sustenta a recomendação: GB de memória, ou % livre no disco. */
        value:
          reason === 'memory'
            ? Math.round((memoryGb ?? 0) * 10) / 10
            : Math.round((diskFreePercent ?? 0) * 10) / 10,
        healthScore: row.healthScore,
        healthStatus: row.healthStatus,
      };
    })
    .filter((row): row is UpgradeCandidate => row !== null)
    /* A pior primeiro: menos memória, ou menos espaço livre. */
    .sort((a, b) => a.value - b.value)
    .slice(0, LIST_LIMIT);
}

function toTroublesome(rows: readonly TroubleRow[]): TroublesomeMachine[] {
  return rows
    .map((row) => ({
      ...machineOf(row),
      maintenanceCount: row.maintenanceCount,
      alertCount: row.alertCount,
      lastMaintenanceAt: row.lastMaintenanceAt?.toISOString() ?? null,
    }))
    .filter(isTroublesome)
    .sort((a, b) => troubleScore(b) - troubleScore(a))
    .slice(0, LIST_LIMIT);
}

/**
 * As máquinas de reserva: em uso, cadastradas e SEM DEPARTAMENTO.
 *
 * É a mesma marca do sistema antigo — a máquina que está na prateleira esperando alguém não
 * pertence a nenhum setor. Ordenadas pela melhor primeiro (mais memória), que é o que se
 * pergunta na hora de escolher uma.
 */
function toSpares(rows: readonly HardwareRow[]): SpareMachine[] {
  return rows
    .filter((row) => row.department === null)
    .map((row) => ({
      ...machineOf(row),
      healthScore: row.healthScore,
      healthStatus: row.healthStatus,
      memoryGb: memoryGbOf(row) === null ? null : Math.round((memoryGbOf(row) ?? 0) * 10) / 10,
      diskGb:
        row.totalDiskBytes === null
          ? null
          : Math.round((row.totalDiskBytes / BYTES_PER_GB) * 10) / 10,
      cpuModel: row.cpuModel,
      lastSeenAt: row.lastSeenAt?.toISOString() ?? null,
    }))
    .sort((a, b) => (b.memoryGb ?? 0) - (a.memoryGb ?? 0))
    .slice(0, LIST_LIMIT);
}
