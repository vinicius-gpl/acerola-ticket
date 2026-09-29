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



/**
 * RECORRÊNCIA: o mesmo problema acontecendo de novo, e de novo.
 *
 * É a pergunta que um número total não responde. "Catorze chamados no mês" pode ser catorze
 * coisas diferentes; "a mesma pessoa abriu quatro de impressora" é um problema que ninguém
 * resolveu, e que vai voltar na semana que vem.
 *
 * O corte é TRÊS, o mesmo do sistema antigo: dois é coincidência, três é padrão.
 */
export const RECURRENCE_THRESHOLD = 3;

/** Recorrência por PESSOA: aponta para treinamento, ou para um equipamento compartilhado. */
export const recurringByPersonSchema = z.object({
  requesterName: z.string(),
  department: z.string().nullable(),
  problemType: z.string(),
  count: z.number().int(),
});

export type RecurringByPerson = z.infer<typeof recurringByPersonSchema>;

/**
 * Recorrência por MÁQUINA — o que o sistema antigo não conseguia ver.
 *
 * Lá o chamado não apontava para computador nenhum, então só dava para agrupar por pessoa.
 * Com o vínculo, "a CONTABIL-03 deu quatro chamados de impressora" vira uma frase que decide
 * troca de equipamento.
 */
export const recurringByMachineSchema = z.object({
  computerId: z.number().int(),
  computerName: z.string(),
  problemType: z.string(),
  count: z.number().int(),
});

export type RecurringByMachine = z.infer<typeof recurringByMachineSchema>;

/** Máquina que já consumiu manutenção demais — a partir de três, é candidata a troca. */
export const heavyMaintenanceSchema = z.object({
  computerId: z.number().int(),
  computerName: z.string(),
  maintenanceCount: z.number().int(),
});

export type HeavyMaintenance = z.infer<typeof heavyMaintenanceSchema>;

/**
 * Máquina batendo no teto: quantos EPISÓDIOS de alerta ela teve.
 *
 * Só informativo, e é assim que a tela precisa dizer. Todo computador chega a 100% de
 * processador ao abrir um programa; o que interessa é quem faz isso o tempo todo — quando
 * alguém reclamar que a máquina está lenta, o motivo já está aqui.
 */
export const peakingMachineSchema = z.object({
  computerId: z.number().int(),
  computerName: z.string(),
  /** Episódios de hoje e do mês. A tela alterna entre os dois. */
  today: z.number().int(),
  month: z.number().int(),
  /** Qual medida mais estourou: processador, memória ou disco. */
  topMetric: z.enum(['cpu', 'memory', 'disk']).nullable(),
});

export type PeakingMachine = z.infer<typeof peakingMachineSchema>;

/** Uma manutenção na lista do "o que foi feito". */
export const maintenanceEntrySchema = z.object({
  id: z.number().int(),
  computerName: z.string(),
  type: z.string(),
  description: z.string(),
  performedBy: z.string().nullable(),
  performedAt: z.string().datetime(),
});

export type MaintenanceEntry = z.infer<typeof maintenanceEntrySchema>;

/**
 * Os três recortes de tempo, prontos, na MESMA resposta.
 *
 * A tela alterna entre Dia, Semana e Mês com um clique. Buscar de novo a cada clique deixaria
 * a troca lenta por um dado que é pequeno — são poucas manutenções por mês — e faria o painel
 * inteiro recarregar para mudar um bloco.
 */
const periodsOf = <T extends z.ZodTypeAny>(item: T) =>
  z.object({ day: z.array(item), week: z.array(item), month: z.array(item) });

export const maintenanceLogSchema = periodsOf(maintenanceEntrySchema);

export type MaintenanceLog = z.infer<typeof maintenanceLogSchema>;

export const maintenanceByTypeSchema = periodsOf(countByKeySchema);

/** O plano automático: uma máquina por dia útil, da mais urgente para a menos. */
export const plannedMaintenanceSchema = z.object({
  computerId: z.number().int(),
  computerName: z.string(),
  department: departmentSchema.nullable(),
  /** O dia útil em que ela caiu no plano. */
  plannedFor: z.string().datetime(),
  /** Há quantos meses ela não é aberta. Nulo quando nunca foi. */
  monthsSinceLast: z.number().nullable(),
});

export type PlannedMaintenance = z.infer<typeof plannedMaintenanceSchema>;

/**
 * Tudo que o painel do sistema antigo mostrava e este ainda não mostrava.
 *
 * Vai num objeto à parte, e não solto no `dashboardSchema`, porque é um bloco de tela: quem
 * lê o contrato vê de uma vez o que compõe a metade de baixo do painel.
 */
export const dashboardPanelsSchema = z.object({
  recurringByPerson: z.array(recurringByPersonSchema),
  recurringByMachine: z.array(recurringByMachineSchema),
  heavyMaintenance: z.array(heavyMaintenanceSchema),
  peaking: z.array(peakingMachineSchema),
  maintenanceLog: maintenanceLogSchema,
  maintenanceByType: maintenanceByTypeSchema,
  /** O que o plano automático manda fazer hoje, e se já foi feito. */
  plannedToday: z.array(plannedMaintenanceSchema),
  doneToday: z.boolean(),
});

export type DashboardPanels = z.infer<typeof dashboardPanelsSchema>;

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
  /** Os blocos que o painel do sistema antigo tinha — ver `dashboardPanelsSchema`. */
  panels: dashboardPanelsSchema,
});

export type Dashboard = z.infer<typeof dashboardSchema>;
