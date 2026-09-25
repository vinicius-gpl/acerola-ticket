import { z } from 'zod';

import { HEALTH_STATUSES } from '../domain/computer-health.util';
import { departmentSchema } from './computer.schema';

/**
 * O CONTRATO da Inteligência: o que os dados juntos dizem, e que nenhuma tela sozinha mostra.
 *
 * Tudo é CALCULADO a cada consulta, cruzando inventário, telemetria e manutenção. Nada aqui
 * é tabela — uma "recomendação de upgrade" guardada envelheceria no dia em que alguém
 * colocasse a memória.
 */

export const DEFAULT_INSIGHT_DAYS = 30;

export const insightQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(DEFAULT_INSIGHT_DAYS),
});

export type InsightQuery = z.infer<typeof insightQuerySchema>;

/** O que identifica uma máquina em qualquer lista desta tela. */
const machineShape = {
  computerId: z.number().int(),
  computerName: z.string(),
  computerDisplayName: z.string().nullable(),
  department: departmentSchema.nullable(),
};

/**
 * Máquina SOBRECARREGADA: a que vive no limite, e não a que teve um pico.
 *
 * A conta é a MÉDIA do período, não o pior momento: todo computador chega a 100% de
 * processador ao abrir um programa, e apontar isso como problema encheria a tela de ruído.
 */
export const overloadedMachineSchema = z.object({
  ...machineShape,
  averageCpuPercent: z.number(),
  averageMemoryPercent: z.number(),
  /** Quantas leituras entraram na média — sem isso, uma máquina com duas leituras mentiria. */
  sampleCount: z.number().int(),
  /** Alertas abertos agora: o que está travado neste instante. */
  activeAlerts: z.number().int(),
});

export type OverloadedMachine = z.infer<typeof overloadedMachineSchema>;

export const UPGRADE_REASONS = ['memory', 'disk'] as const;

export type UpgradeReason = (typeof UPGRADE_REASONS)[number];

/**
 * Máquina que PRECISA DE UPGRADE, e o que trocar nela.
 *
 * Só há duas recomendações porque só há duas medidas confiáveis: memória total e espaço
 * livre em disco. **Trocar HD por SSD não entra**: o agente não consegue distinguir um do
 * outro (ver `computer-health.util`), e recomendar a troca de um disco que já é SSD faria a
 * tela perder a confiança de quem a lê.
 */
export const upgradeCandidateSchema = z.object({
  ...machineShape,
  reason: z.enum(UPGRADE_REASONS),
  /** O número que sustenta a recomendação: GB de memória, ou % livre no disco. */
  value: z.number(),
  healthScore: z.number().int(),
  healthStatus: z.enum(HEALTH_STATUSES),
});

export type UpgradeCandidate = z.infer<typeof upgradeCandidateSchema>;

/**
 * Máquina que DÁ TRABALHO: a que já consumiu manutenção demais.
 *
 * A conta é de MANUTENÇÕES e alertas, não de chamados. Um chamado, neste sistema, é aberto
 * por uma pessoa de um departamento e não aponta para máquina nenhuma — somar os dois daria
 * um número que parece preciso e não é.
 */
export const troublesomeMachineSchema = z.object({
  ...machineShape,
  maintenanceCount: z.number().int(),
  /** Quantas vezes ela entrou em alerta no período. */
  alertCount: z.number().int(),
  lastMaintenanceAt: z.string().datetime().nullable(),
});

export type TroublesomeMachine = z.infer<typeof troublesomeMachineSchema>;

/**
 * Máquina de RESERVA: cadastrada, em uso, e sem departamento.
 *
 * "Sem departamento" é como o sistema antigo marcava o que está na prateleira esperando
 * alguém. Aqui é a mesma regra, e por isso a tela diz isso com todas as letras — quem deixar
 * o campo em branco por engano vai ver a máquina aparecer como reserva.
 */
export const spareMachineSchema = z.object({
  ...machineShape,
  healthScore: z.number().int(),
  healthStatus: z.enum(HEALTH_STATUSES),
  memoryGb: z.number().nullable(),
  diskGb: z.number().nullable(),
  cpuModel: z.string().nullable(),
  lastSeenAt: z.string().datetime().nullable(),
});

export type SpareMachine = z.infer<typeof spareMachineSchema>;

export const insightsSchema = z.object({
  days: z.number().int(),
  overloaded: z.array(overloadedMachineSchema),
  upgrades: z.array(upgradeCandidateSchema),
  troublesome: z.array(troublesomeMachineSchema),
  spares: z.array(spareMachineSchema),
});

export type Insights = z.infer<typeof insightsSchema>;
