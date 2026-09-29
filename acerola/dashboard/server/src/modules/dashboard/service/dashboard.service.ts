import { Injectable } from '@nestjs/common';
import { type HealthStatus } from '@template/shared/domain/computer-health.util';
import { bySeverity, isProblem } from '@template/shared/domain/dashboard-severity.util';
import { type Department } from '@template/shared/domain/department.util';
import { preventiveStatusOf } from '@template/shared/domain/maintenance.util';
import { buildMaintenancePlan, plannedForToday } from '@template/shared/domain/maintenance-plan.util';
import { FREQUENT_MAINTENANCE_COUNT } from '@template/shared/domain/maintenance.util';
import {
  RECURRENCE_THRESHOLD,
  type Dashboard,
  type DashboardQuery,
  type ProblemMachine,
} from '@template/shared/schemas/dashboard.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import {
  DashboardRepository,
  type MaintenanceLogRow,
  type PeakingRow,
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

    /* O mês CORRENTE, do dia 1. É o recorte dos blocos de baixo do painel — recorrência,
       manutenções feitas, picos —, e é diferente do `days` que a pessoa escolhe em cima: ali
       ela pergunta "como foram os últimos 30 dias", aqui ela pergunta "como vai setembro". */
    const monthStart = startOfMonth();

    const [
      health,
      neverSeen,
      tickets,
      byProblemType,
      byDepartment,
      maintenanceCount,
      parts,
      machines,
      preventive,
      recurringByPerson,
      recurringByMachine,
      heavyMaintenance,
      peaking,
      maintenanceLog,
      planCandidates,
    ] = await Promise.all([
        this.repository.healthCounts(),
        this.repository.neverSeenCount(),
        this.repository.ticketCounts(since),
        this.repository.ticketsByProblemType(since, CHART_LIMIT),
        this.repository.ticketsByDepartment(since, CHART_LIMIT),
        this.repository.maintenancesInPeriod(since),
        this.repository.partsSummary(),
        this.repository.machinesWithProblems(),
        this.repository.lastPreventiveByMachine(),
        this.repository.recurringByPerson(monthStart, RECURRENCE_THRESHOLD),
        this.repository.recurringByMachine(monthStart, RECURRENCE_THRESHOLD),
        this.repository.heavyMaintenance(FREQUENT_MAINTENANCE_COUNT),
        this.repository.peakingMachines(monthStart),
        this.repository.maintenanceLog(monthStart),
        this.repository.planCandidates(),
      ]);

    const plan = buildMaintenancePlan(
      planCandidates.map((candidate) => ({
        computerId: candidate.computerId,
        computerName: candidate.computerName,
        department: candidate.department,
        lastDoneAt: candidate.lastDoneAt?.toISOString() ?? null,
      })),
    );

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
      panels: {
        recurringByPerson,
        recurringByMachine,
        heavyMaintenance,
        peaking: peaking.map(toPeaking),
        maintenanceLog: splitByPeriod(maintenanceLog, (entry) => entry.performedAt, (rows) =>
          rows.map(toLogEntry),
        ),
        maintenanceByType: splitByPeriod(maintenanceLog, (entry) => entry.performedAt, countByType),
        plannedToday: plannedForToday(plan).map((entry) => ({
          computerId: entry.computerId,
          computerName: entry.computerName,
          department: (entry.department as Department | null) ?? null,
          plannedFor: entry.plannedFor.toISOString(),
          monthsSinceLast: entry.monthsSinceLast,
        })),
        /* "Já foi feita a de hoje" é o que decide entre cobrar e parabenizar. */
        doneToday: maintenanceLog.some((entry) => isToday(entry.performedAt)),
      },
    };
  }
}

/** O primeiro instante do mês corrente. */
function startOfMonth(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function isToday(date: Date, now: Date = new Date()): boolean {
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

/** O começo da semana, na segunda-feira — é como se conta semana de trabalho no Brasil. */
function startOfWeek(now: Date = new Date()): Date {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekday = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - weekday);

  return start;
}

function startOfDay(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Reparte a MESMA lista nos três recortes que a tela alterna.
 *
 * Uma consulta traz o mês; dia e semana são pedaços dele. Três consultas para três recortes do
 * mesmo dado seria trabalho repetido, e a troca de aba viraria ida ao banco.
 */
function splitByPeriod<TRow, TOut>(
  rows: readonly TRow[],
  at: (row: TRow) => Date,
  shape: (rows: TRow[]) => TOut[],
): { day: TOut[]; week: TOut[]; month: TOut[] } {
  const day = startOfDay();
  const week = startOfWeek();

  return {
    day: shape(rows.filter((row) => at(row) >= day)),
    week: shape(rows.filter((row) => at(row) >= week)),
    month: shape([...rows]),
  };
}

/** Conta as manutenções por tipo, da mais comum para a menos — é o que a rosca desenha. */
function countByType(rows: MaintenanceLogRow[]): StatusCount[] {
  const byType = new Map<string, number>();
  for (const row of rows) byType.set(row.type, (byType.get(row.type) ?? 0) + 1);

  return [...byType.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function toLogEntry(row: MaintenanceLogRow): Dashboard['panels']['maintenanceLog']['month'][number] {
  return {
    id: row.id,
    computerName: row.computerName,
    type: row.type,
    description: row.description ?? '',
    performedBy: row.performedBy,
    performedAt: row.performedAt.toISOString(),
  };
}

/** O `mode()` do Postgres devolve texto; só as três medidas conhecidas passam. */
function toPeaking(row: PeakingRow): Dashboard['panels']['peaking'][number] {
  const metric = row.topMetric;

  return {
    computerId: row.computerId,
    computerName: row.computerName,
    today: row.today,
    month: row.month,
    topMetric:
      metric === 'cpu' || metric === 'memory' || metric === 'disk' ? metric : null,
  };
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
