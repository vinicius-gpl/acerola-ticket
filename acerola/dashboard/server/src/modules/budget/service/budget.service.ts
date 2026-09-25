import { Injectable } from '@nestjs/common';
import {
  BUDGET_NEEDS,
  BUDGET_NEED_CATEGORY,
  type BudgetNeedKey,
  toBuyOf,
} from '@template/shared/domain/budget-need.util';
import { type Department } from '@template/shared/domain/department.util';
import {
  TROUBLESOME_MAINTENANCE_COUNT,
  UPGRADE_DISK_FREE_PERCENT,
  UPGRADE_MEMORY_GB,
} from '@template/shared/domain/insight-rules.util';
import {
  type Budget,
  type BudgetMachine,
  type BudgetNeed,
} from '@template/shared/schemas/budget.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import { BudgetRepository, type BudgetComputerRow } from '../repository/budget.repository';

const BYTES_PER_GB = 1024 ** 3;

/** Quantas máquinas cada necessidade lista. O número total continua inteiro acima da lista. */
const MACHINE_LIMIT = 10;

/**
 * O ORÇAMENTO: quantas peças comprar, já descontando o depósito.
 *
 * As réguas são IMPORTADAS da Inteligência (`insight-rules.util`), de propósito: se esta tela
 * usasse 6 GB e a outra 8 GB, as duas apontariam números diferentes para o mesmo parque e a
 * equipe passaria a discutir qual está certa em vez de comprar a memória.
 *
 * **Uma diferença deliberada em relação à Inteligência:** lá, uma máquina apertada de memória
 * E de disco aparece uma vez só, com a recomendação mais barata primeiro — é uma lista de
 * atenção. Aqui ela entra nas duas necessidades, porque são duas peças a comprar.
 */
@Injectable()
export class BudgetService {
  constructor(private readonly repository: BudgetRepository) {}

  async summary(user: RequestUser): Promise<Budget> {
    assertCanRead(user.role, 'o orçamento do parque');

    /* As duas consultas são independentes; enfileirá-las só deixaria a tela mais lenta. */
    const [rows, stock] = await Promise.all([this.repository.computers(), this.repository.stock()]);

    const balances = new Map(stock.map((row) => [row.category, row.balance]));

    return { needs: BUDGET_NEEDS.map((key) => needOf(key, rows, balances)) };
  }
}

function needOf(
  key: BudgetNeedKey,
  rows: readonly BudgetComputerRow[],
  balances: ReadonlyMap<string, number>,
): BudgetNeed {
  const machines = machinesFor(key, rows);
  const inStock = balances.get(BUDGET_NEED_CATEGORY[key]) ?? 0;

  return {
    key,
    needed: machines.length,
    inStock,
    toBuy: toBuyOf(machines.length, inStock),
    /* O corte é só da LISTA: `needed` acima continua sendo o parque inteiro. */
    machines: machines.slice(0, MACHINE_LIMIT),
  };
}

function machineOf(row: BudgetComputerRow, value: number): BudgetMachine {
  return {
    computerId: row.computerId,
    computerName: row.computerName,
    computerDisplayName: row.computerDisplayName,
    department: (row.department as Department | null) ?? null,
    value: Math.round(value * 10) / 10,
  };
}

/** GB de memória, ou nada quando o agente nunca mediu esta máquina. */
function memoryGbOf(row: BudgetComputerRow): number | null {
  return row.totalMemoryBytes === null ? null : row.totalMemoryBytes / BYTES_PER_GB;
}

function diskFreePercentOf(row: BudgetComputerRow): number | null {
  if (!row.totalDiskBytes || row.freeDiskBytes === null) return null;

  return (row.freeDiskBytes / row.totalDiskBytes) * 100;
}

/**
 * Quem precisa de cada coisa, o mais apertado primeiro.
 *
 * Máquina sem medição NÃO entra em lista nenhuma: pedir um pente de memória para um
 * computador cujo agente nunca conectou é comprar no escuro.
 */
function machinesFor(key: BudgetNeedKey, rows: readonly BudgetComputerRow[]): BudgetMachine[] {
  if (key === 'memory') return byMemory(rows);
  if (key === 'disk') return byDisk(rows);

  return byMaintenance(rows);
}

function byMemory(rows: readonly BudgetComputerRow[]): BudgetMachine[] {
  return rows
    .map((row) => ({ row, memoryGb: memoryGbOf(row) }))
    .filter(({ memoryGb }) => memoryGb !== null && memoryGb < UPGRADE_MEMORY_GB)
    .map(({ row, memoryGb }) => machineOf(row, memoryGb ?? 0))
    .sort((a, b) => a.value - b.value);
}

function byDisk(rows: readonly BudgetComputerRow[]): BudgetMachine[] {
  return rows
    .map((row) => ({ row, freePercent: diskFreePercentOf(row) }))
    .filter(({ freePercent }) => freePercent !== null && freePercent < UPGRADE_DISK_FREE_PERCENT)
    .map(({ row, freePercent }) => machineOf(row, freePercent ?? 0))
    .sort((a, b) => a.value - b.value);
}

function byMaintenance(rows: readonly BudgetComputerRow[]): BudgetMachine[] {
  return rows
    .filter((row) => row.maintenanceCount >= TROUBLESOME_MAINTENANCE_COUNT)
    .map((row) => machineOf(row, row.maintenanceCount))
    .sort((a, b) => b.value - a.value);
}
