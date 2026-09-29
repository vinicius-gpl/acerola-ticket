/**
 * AS RÉGUAS DA INTELIGÊNCIA: quando uma máquina entra em cada lista.
 *
 * Cada número aqui é uma decisão de produto, não um detalhe técnico — é ele que separa "a
 * máquina está no limite" de "a máquina está trabalhando". Por isso eles moram no domínio,
 * com teste, e não escondidos dentro de uma consulta SQL.
 */

import { type UpgradeReason } from '../schemas/insight.schema';

/**
 * A partir de quanto de uso MÉDIO a máquina é considerada sobrecarregada.
 *
 * Média, e não pico: todo computador chega a 100% de processador ao abrir um programa. O que
 * dói para quem usa é a máquina viver perto do teto o dia inteiro.
 *
 * Memória tem régua mais alta que processador porque é assim que o Windows trabalha — ele
 * ocupa a memória livre com cache de propósito, e 70% de memória é rotina, enquanto 70% de
 * processador sustentado não é.
 */
export const OVERLOADED_CPU_PERCENT = 70;
export const OVERLOADED_MEMORY_PERCENT = 85;

/**
 * Menos leituras do que isto não vira média: uma máquina que mandou três leituras logo
 * depois de ligar apareceria como sobrecarregada por causa da inicialização do Windows.
 */
export const MINIMUM_SAMPLES = 20;

export type OverloadInput = {
  averageCpuPercent: number;
  averageMemoryPercent: number;
  sampleCount: number;
};

export function isOverloaded(machine: OverloadInput): boolean {
  if (machine.sampleCount < MINIMUM_SAMPLES) return false;

  return (
    machine.averageCpuPercent >= OVERLOADED_CPU_PERCENT ||
    machine.averageMemoryPercent >= OVERLOADED_MEMORY_PERCENT
  );
}

/** O quanto a máquina está no limite, para ordenar a lista pela pior. */
export function overloadScore(machine: OverloadInput): number {
  return Math.max(
    machine.averageCpuPercent / OVERLOADED_CPU_PERCENT,
    machine.averageMemoryPercent / OVERLOADED_MEMORY_PERCENT,
  );
}

/** A mesma régua da nota de saúde: abaixo disto o Windows já usa disco como memória. */
export const UPGRADE_MEMORY_GB = 8;

/** Menos de 15% livre já é hora de planejar o disco, antes de virar alerta de disco cheio. */
export const UPGRADE_DISK_FREE_PERCENT = 15;

export type UpgradeInput = {
  memoryGb: number | null;
  diskFreePercent: number | null;
};

/**
 * O que trocar nesta máquina, se houver algo.
 *
 * Memória vem antes de disco quando os dois apertam: comprar um pente é mais barato do que
 * trocar o disco, e resolve a queixa mais comum ("está lento").
 */
export function upgradeReasonOf(machine: UpgradeInput): UpgradeReason | null {
  if (machine.memoryGb !== null && machine.memoryGb < UPGRADE_MEMORY_GB) return 'memory';

  if (machine.diskFreePercent !== null && machine.diskFreePercent < UPGRADE_DISK_FREE_PERCENT) {
    return 'disk';
  }

  return null;
}

export const UPGRADE_REASON_LABELS: Record<UpgradeReason, string> = {
  memory: 'Mais memória',
  disk: 'Disco maior (ou limpeza)',
};

export function upgradeReasonLabel(reason: UpgradeReason): string {
  return UPGRADE_REASON_LABELS[reason];
}

/**
 * A partir de quantas manutenções a máquina vira assunto de troca.
 *
 * Três é o mesmo número da tela de Manutenção, e de propósito: dois lugares contando a mesma
 * coisa com réguas diferentes é como a equipe passa a discutir qual tela está certa.
 */
export const TROUBLESOME_MAINTENANCE_COUNT = 3;

export type TroubleInput = { maintenanceCount: number; alertCount: number };

export function isTroublesome(machine: TroubleInput): boolean {
  return machine.maintenanceCount >= TROUBLESOME_MAINTENANCE_COUNT;
}

/** Quanto trabalho a máquina deu: manutenção pesa mais que alerta, porque custa mão de obra. */
export function troubleScore(machine: TroubleInput): number {
  return machine.maintenanceCount * 10 + machine.alertCount;
}
