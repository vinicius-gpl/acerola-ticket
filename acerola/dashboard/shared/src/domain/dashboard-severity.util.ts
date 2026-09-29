import { type HealthStatus } from './computer-health.util';
import { isFrequentlyServiced } from './maintenance.util';

/**
 * A ORDEM DO MAPA DE PROBLEMAS: qual máquina alguém precisa olhar primeiro.
 *
 * A regra existe porque "pior" não é uma coisa só. Uma máquina com disco cheio AGORA é mais
 * urgente do que uma com nota baixa que está parada há meses; e entre duas iguais, a que já
 * consumiu três manutenções é a que vale discutir a troca.
 *
 * Função pura, e testada: é ela que decide o que aparece no alto da tela que a pessoa abre
 * de manhã. Errar a ordem aqui é esconder o problema atrás do que não é problema.
 */

export type SeverityInput = {
  healthStatus: HealthStatus;
  /** Episódios de alerta acontecendo agora. */
  activeAlerts: number;
  maintenanceCount: number;
  healthScore: number;
};

/** Crítica pesa mais que atenção; boa não entra no mapa. */
const STATUS_WEIGHT: Record<HealthStatus, number> = { critical: 100, attention: 40, good: 0 };

/**
 * Quanto pesa cada alerta ABERTO.
 *
 * Maior do que o peso de "crítica" (100) somado ao de "atenção" (40) permite: uma máquina em
 * atenção COM alerta aberto (120) passa na frente de uma crítica parada (100). É de propósito
 * — o alerta aberto é um problema acontecendo neste instante, e a nota baixa já está baixa há
 * semanas.
 */
const ACTIVE_ALERT_WEIGHT = 80;

/** A máquina que já deu trabalho demais entra no mapa mesmo sem estar em chamas hoje. */
const FREQUENT_SERVICE_WEIGHT = 25;

export function severityOf(machine: SeverityInput): number {
  const status = STATUS_WEIGHT[machine.healthStatus];
  const alerts = machine.activeAlerts * ACTIVE_ALERT_WEIGHT;
  const frequent = isFrequentlyServiced(machine.maintenanceCount) ? FREQUENT_SERVICE_WEIGHT : 0;

  return status + alerts + frequent;
}

/** Uma máquina só entra no mapa se tiver algo a dizer. */
export function isProblem(machine: SeverityInput): boolean {
  return severityOf(machine) > 0;
}

/**
 * Do mais grave para o menos. Empate desempata pela nota (a menor primeiro) e, se ainda
 * empatar, pelo nome — para a lista não dançar a cada consulta.
 */
export function bySeverity<T extends SeverityInput & { computerName: string }>(a: T, b: T): number {
  const severity = severityOf(b) - severityOf(a);
  if (severity !== 0) return severity;

  const score = a.healthScore - b.healthScore;
  if (score !== 0) return score;

  return a.computerName.localeCompare(b.computerName, 'pt-BR');
}
