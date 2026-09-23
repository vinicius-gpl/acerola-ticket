import { Injectable } from '@nestjs/common';
import { type HealthStatus } from '@template/shared/domain/computer-health.util';
import { bySeverity, isProblem } from '@template/shared/domain/dashboard-severity.util';
import { type Department } from '@template/shared/domain/department.util';
import { preventiveStatusOf } from '@template/shared/domain/maintenance.util';
import {
  type Dashboard,
  type DashboardQuery,
  type ProblemMachine,
} from '@template/shared/schemas/dashboard.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import {
  DashboardRepository,
  type MachineRow,
  type StatusCount,
} from '../repository/dashboard.repository';

/** Quantas máquinas o mapa de problemas mostra. Mais que isso vira lista, não mapa. */
const WORST_MACHINES_LIMIT = 6;

/** Quantas barras cabem num gráfico sem virar régua ilegível. */
const CHART_LIMIT = 8;

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * O painel: o resumo do que está pegando fogo, cruzando as quatro áreas.
 *
 * Só leitura, e as consultas saem TODAS JUNTAS (`Promise.all`): são sete perguntas
 * independentes, e enfileirá-las faria a tela que a pessoa abre de manhã ser a mais lenta do
 * sistema.
 */
@Injectable()
export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async summary(user: RequestUser, query: DashboardQuery): Promise<Dashboard> {
    assertCanRead(user.role, 'o painel');

    const since = new Date(Date.now() - query.days * MILLISECONDS_PER_DAY);

    const [health, neverSeen, tickets, byProblemType, byDepartment, maintenanceCount, parts, machines, preventive] =
      await Promise.all([
        this.repository.healthCounts(),
        this.repository.neverSeenCount(),
        this.repository.ticketCounts(since),
        this.repository.ticketsByProblemType(since, CHART_LIMIT),
        this.repository.ticketsByDepartment(since, CHART_LIMIT),
        this.repository.maintenancesInPeriod(since),
        this.repository.partsSummary(),
        this.repository.machinesWithProblems(),
        this.repository.lastPreventiveByMachine(),
      ]);

    return {
      days: query.days,
      park: {
        total: totalOf(health),
        critical: countOf(health, 'critical'),
        attention: countOf(health, 'attention'),
        neverSeen,
      },
      tickets,
      maintenance: {
        doneInPeriod: maintenanceCount,
        preventiveDue: preventive.filter(
          (row) => preventiveStatusOf(row.lastDoneAt?.toISOString() ?? null) !== 'ok',
        ).length,
      },
      parts,
      worstMachines: toWorstMachines(machines),
      byProblemType,
      byDepartment,
    };
  }
}

function totalOf(rows: readonly StatusCount[]): number {
  return rows.reduce((total, row) => total + row.count, 0);
}

function countOf(rows: readonly StatusCount[], key: HealthStatus): number {
  return rows.find((row) => row.key === key)?.count ?? 0;
}

/**
 * O mapa: só as máquinas que têm algo a dizer, da mais grave para a menos.
 *
 * A ordem vem do domínio (`bySeverity`), e não de um `order by`: a regra mistura saúde,
 * alerta aberto e histórico de manutenção, e escrevê-la em SQL a esconderia de qualquer
 * teste que não suba um banco.
 */
function toWorstMachines(rows: readonly MachineRow[]): ProblemMachine[] {
  return rows
    .map((row) => ({
      computerId: row.computerId,
      computerName: row.computerName,
      computerDisplayName: row.computerDisplayName,
      department: (row.department as Department | null) ?? null,
      healthScore: row.healthScore,
      healthStatus: row.healthStatus,
      activeAlerts: row.activeAlerts,
      maintenanceCount: row.maintenanceCount,
    }))
    .filter(isProblem)
    .sort(bySeverity)
    .slice(0, WORST_MACHINES_LIMIT);
}
