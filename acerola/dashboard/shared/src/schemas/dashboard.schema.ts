import { z } from 'zod';

import { HEALTH_STATUSES } from '../domain/computer-health.util';
import { departmentSchema } from './computer.schema';

/**
 * O CONTRATO do painel: o resumo do que está pegando fogo, num lugar só.
 *
 * Nada aqui é tabela. Tudo é CALCULADO a cada consulta, cruzando chamados, inventário,
 * manutenção e depósito — guardar esses números como campo daria um painel que envelhece em
 * silêncio, mostrando ontem com cara de hoje.
 */

/** O recorte de tempo do painel, em dias. */
export const DEFAULT_PERIOD_DAYS = 30;
export const MAX_PERIOD_DAYS = 365;

export const PERIOD_OPTIONS = [7, 30, 90] as const;

export const dashboardQuerySchema = z.object({
  days: z.coerce
    .number({ invalid_type_error: 'O período precisa ser um número de dias' })
    .int()
    .min(1, 'O período precisa ter pelo menos um dia')
    .max(MAX_PERIOD_DAYS, `O período pode ir até ${MAX_PERIOD_DAYS} dias`)
    .default(DEFAULT_PERIOD_DAYS),
});

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

/**
 * A saúde do parque.
 *
 * "Online agora" NÃO entra aqui: estar online é uma conexão viva, que só o inventário sabe,
 * e um número desses num resumo que se olha uma vez por dia envelheceria em segundos.
 */
export const parkHealthSchema = z.object({
  total: z.number().int(),
  critical: z.number().int(),
  attention: z.number().int(),
  /** Cadastradas cujo agente nunca conectou — falta instalar o agente nelas. */
  neverSeen: z.number().int(),
});

export const ticketSummarySchema = z.object({
  /** Abertos AGORA, sem recorte de tempo: é uma fila, não um histórico. */
  open: z.number().int(),
  inProgress: z.number().int(),
  openedInPeriod: z.number().int(),
  resolvedInPeriod: z.number().int(),
  /** Nulo quando nada foi resolvido no período — zero diria atendimento instantâneo. */
  averageResolutionHours: z.number().nullable(),
});

export const maintenanceSummarySchema = z.object({
  doneInPeriod: z.number().int(),
  /** Máquinas que passaram dos três meses ou nunca foram abertas. */
  preventiveDue: z.number().int(),
});

export const partsSummarySchema = z.object({
  kinds: z.number().int(),
  items: z.number().int(),
  outOfStock: z.number().int(),
});

/**
 * Uma máquina no mapa de problemas.
 *
 * Os chamados NÃO entram na conta: um chamado é aberto por uma pessoa de um departamento e
 * não aponta para máquina nenhuma (ver o contrato de chamados). Somar os dois aqui daria um
 * número que parece preciso e não é.
 */
export const problemMachineSchema = z.object({
  computerId: z.number().int(),
  computerName: z.string(),
  computerDisplayName: z.string().nullable(),
  department: departmentSchema.nullable(),
  healthScore: z.number().int(),
  healthStatus: z.enum(HEALTH_STATUSES),
  /** Episódios de alerta acontecendo agora — disco cheio, memória no talo. */
  activeAlerts: z.number().int(),
  /** Quantas manutenções a máquina já teve: três ou mais já é candidata a troca. */
  maintenanceCount: z.number().int(),
});

export type ProblemMachine = z.infer<typeof problemMachineSchema>;

export const countByKeySchema = z.object({ key: z.string(), count: z.number().int() });

export type CountByKey = z.infer<typeof countByKeySchema>;

export const dashboardSchema = z.object({
  /** O recorte usado, para a tela poder dizer "nos últimos 30 dias" com verdade. */
  days: z.number().int(),
  park: parkHealthSchema,
  tickets: ticketSummarySchema,
  maintenance: maintenanceSummarySchema,
  parts: partsSummarySchema,
  /** As máquinas em pior estado, da mais grave para a menos. */
  worstMachines: z.array(problemMachineSchema),
  /** Tipos de problema mais abertos no período. */
  byProblemType: z.array(countByKeySchema),
  /** Departamentos que mais pediram socorro no período. */
  byDepartment: z.array(countByKeySchema),
});

export type Dashboard = z.infer<typeof dashboardSchema>;
