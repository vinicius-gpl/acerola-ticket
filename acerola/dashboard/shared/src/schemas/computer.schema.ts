import { z } from 'zod';

import { ALERT_METRICS } from '../domain/computer-alert.util';
import { DISPOSAL_TYPES } from '../domain/disposal.util';
import { DEPARTMENTS } from '../domain/department.util';
import { HEALTH_STATUSES } from '../domain/computer-health.util';
import { paginationQuerySchema } from './pagination.schema';

/**
 * O CONTRATO do computador. Um schema, duas pontas: a API o usa como DTO e Swagger e a web o
 * usa para validar o formulário.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const COMPUTER_NAME_MAX_LENGTH = 120;
export const DISPLAY_NAME_MAX_LENGTH = 120;
export const RESPONSIBLE_NAME_MAX_LENGTH = 200;
export const BLOCK_REASON_MAX_LENGTH = 300;
export const DISPOSAL_REASON_MAX_LENGTH = 300;

export const disposalTypeSchema = z.enum(DISPOSAL_TYPES, {
  errorMap: () => ({ message: 'Diga se a máquina tem defeito ou virou lixo' }),
});

export const healthStatusSchema = z.enum(HEALTH_STATUSES, {
  errorMap: () => ({ message: 'Escolha uma situação de saúde da lista' }),
});

export const departmentSchema = z.enum(DEPARTMENTS, {
  errorMap: () => ({ message: 'Escolha um departamento da lista' }),
});

const computerNameSchema = z
  .string({ required_error: 'Informe o nome da máquina' })
  .trim()
  .min(1, 'Informe o nome da máquina')
  .max(COMPUTER_NAME_MAX_LENGTH, `O nome pode ter até ${COMPUTER_NAME_MAX_LENGTH} caracteres`);

const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((value) => (value === '' ? null : value))
    .nullable();

const displayNameSchema = optionalText(
  DISPLAY_NAME_MAX_LENGTH,
  `O apelido pode ter até ${DISPLAY_NAME_MAX_LENGTH} caracteres`,
);

const responsibleNameSchema = optionalText(
  RESPONSIBLE_NAME_MAX_LENGTH,
  `O nome do responsável pode ter até ${RESPONSIBLE_NAME_MAX_LENGTH} caracteres`,
);

const blockReasonSchema = optionalText(
  BLOCK_REASON_MAX_LENGTH,
  `O motivo pode ter até ${BLOCK_REASON_MAX_LENGTH} caracteres`,
);

/** Um aviso que baixou a nota de saúde, como a tela o recebe. */
export const healthWarningSchema = z.object({
  severity: z.enum(['attention', 'critical']),
  message: z.string(),
});

/**
 * Os fatos de hardware da máquina, do último envio do agente.
 *
 * Tudo é nulo até a primeira conexão: um computador é cadastrado no dashboard ANTES de o
 * agente ser instalado nele, e durante esse intervalo não há o que mostrar. Nulo diz "ainda
 * não sei"; zero diria "medi e deu zero", que é outra coisa.
 */
export const computerHardwareSchema = z.object({
  os: z.string().nullable(),
  platform: z.string().nullable(),
  platformVersion: z.string().nullable(),
  kernelVersion: z.string().nullable(),
  arch: z.string().nullable(),
  cpuModel: z.string().nullable(),
  logicalCpus: z.number().int().nullable(),
  physicalCpus: z.number().int().nullable(),
  totalMemoryBytes: z.number().nullable(),
  macAddress: z.string().nullable(),
  localIp: z.string().nullable(),
  totalDiskBytes: z.number().nullable(),
  freeDiskBytes: z.number().nullable(),
  uptimeSeconds: z.number().nullable(),
  bootTime: z.string().datetime().nullable(),
});

export const computerSchema = z.object({
  id: z.number().int(),
  /** O nome que a própria máquina informa. Único: é por ele que o agente se identifica. */
  name: z.string(),
  /** O apelido que o TI deu. Quando existe, é ele que aparece nas listas. */
  displayName: z.string().nullable(),
  responsibleName: z.string().nullable(),
  department: departmentSchema.nullable(),

  hardware: computerHardwareSchema,

  healthScore: z.number().int().min(0).max(100),
  healthStatus: healthStatusSchema,
  warnings: z.array(healthWarningSchema),

  /**
   * Se existe uma conexão do agente ABERTA agora. Não é coluna do banco: é a conexão viva.
   * Como campo salvo, uma máquina ficaria presa em "online" depois de queda de energia.
   */
  isOnline: z.boolean(),
  lastSeenAt: z.string().datetime().nullable(),
  agentVersion: z.string().nullable(),

  /** Arquivada sai das listas, mas não do banco — nada do histórico é destruído. */
  isArchived: z.boolean(),

  /**
   * DESCARTADA: saiu de uso de vez, com motivo e data. Também não some do banco.
   *
   * `disposedAt` nulo é o que diz que a máquina está em uso — não existe um booleano à parte
   * para isso, porque dois campos dizendo a mesma coisa acabam discordando.
   */
  disposedAt: z.string().datetime().nullable(),
  disposalType: disposalTypeSchema.nullable(),
  disposalReason: z.string().nullable(),

  /** Bloqueada tem a conexão recusada, mesmo com token válido. */
  isBlocked: z.boolean(),
  blockReason: z.string().nullable(),

  createdAt: z.string().datetime(),
  createdBy: z.string(),
  updatedAt: z.string().datetime().nullable(),
  updatedBy: z.string().nullable(),
});

export type Computer = z.infer<typeof computerSchema>;

/**
 * Cadastrar um computador. Só o nome — o resto chega quando o agente conectar pela primeira
 * vez.
 *
 * O cadastro vem ANTES da instalação de propósito: é ele que gera o token. Sem isso, qualquer
 * máquina que descobrisse o endereço do servidor entraria sozinha no inventário.
 */
export const createComputerSchema = z.object({
  name: computerNameSchema,
  displayName: displayNameSchema.optional(),
  responsibleName: responsibleNameSchema.optional(),
  department: departmentSchema.nullable().optional(),
});

export type CreateComputerInput = z.input<typeof createComputerSchema>;

/**
 * A resposta do cadastro: o computador e o TOKEN, em texto puro.
 *
 * É a ÚNICA vez que o token existe legível. O banco guarda só o hash dele, como senha — se
 * esta resposta se perder, não há como recuperá-lo, só gerar outro.
 */
export const createdComputerSchema = z.object({
  computer: computerSchema,
  token: z.string(),
});

export type CreatedComputer = z.infer<typeof createdComputerSchema>;

/**
 * O que o TI altera. Nada de hardware entra aqui: aquilo é medido, não digitado — corrigir à
 * mão faria a ficha discordar da máquina de verdade na próxima conexão.
 */
export const updateComputerSchema = z.object({
  displayName: displayNameSchema.optional(),
  responsibleName: responsibleNameSchema.optional(),
  department: departmentSchema.nullable().optional(),
  isArchived: z.boolean().optional(),
  isBlocked: z.boolean().optional(),
  blockReason: blockReasonSchema.optional(),
});

export type UpdateComputerInput = z.input<typeof updateComputerSchema>;

/** A forma do formulário de identificação, no painel. */
export const computerFormSchema = z.object({
  displayName: z.string().max(DISPLAY_NAME_MAX_LENGTH, `Até ${DISPLAY_NAME_MAX_LENGTH} caracteres`),
  responsibleName: z
    .string()
    .max(RESPONSIBLE_NAME_MAX_LENGTH, `Até ${RESPONSIBLE_NAME_MAX_LENGTH} caracteres`),
  department: z.union([departmentSchema, z.literal('')]),
});

export type ComputerFormValues = z.input<typeof computerFormSchema>;

/**
 * A forma do formulário de CADASTRO.
 *
 * É o de identificação mais o nome da máquina, que só existe aqui: depois de cadastrada, o
 * nome é o que o agente informa, e digitá-lo à mão faria a ficha discordar da máquina de
 * verdade na primeira conexão.
 */
export const computerCreateFormSchema = computerFormSchema.extend({
  name: computerNameSchema,
});

export type ComputerCreateFormValues = z.input<typeof computerCreateFormSchema>;

export const computerListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  department: departmentSchema.optional(),
  healthStatus: healthStatusSchema.optional(),
  /** Por padrão as arquivadas NÃO vêm: elas saíram de uso e só atrapalhariam a lista. */
  includeArchived: z.coerce.boolean().optional(),
  /**
   * As DESCARTADAS também ficam de fora por padrão, e esta chave as traz SOZINHAS: é a
   * consulta da tela de Descarte, que é uma lista de quem saiu, não do parque.
   */
  onlyDisposed: z.coerce.boolean().optional(),
  disposalType: disposalTypeSchema.optional(),
});

/**
 * Descartar uma máquina: dizer o tipo e o porquê.
 *
 * A data não entra no corpo — ela é o instante em que a decisão foi registrada, carimbado
 * pelo servidor. Deixar digitar faria o histórico aceitar uma saída "de ontem" lançada por
 * quem quisesse ajustar o passado.
 */
export const disposeComputerSchema = z.object({
  type: disposalTypeSchema,
  reason: z
    .string({ required_error: 'Diga por que a máquina saiu de uso' })
    .trim()
    .min(1, 'Diga por que a máquina saiu de uso')
    .max(DISPOSAL_REASON_MAX_LENGTH, `O motivo pode ter até ${DISPOSAL_REASON_MAX_LENGTH} caracteres`),
});

export type DisposeComputerInput = z.input<typeof disposeComputerSchema>;

/** A forma do formulário de descarte. */
export const disposalFormSchema = z.object({
  type: disposalTypeSchema,
  reason: z
    .string()
    .trim()
    .min(1, 'Diga por que a máquina saiu de uso')
    .max(DISPOSAL_REASON_MAX_LENGTH, `Até ${DISPOSAL_REASON_MAX_LENGTH} caracteres`),
});

export type DisposalFormValues = z.input<typeof disposalFormSchema>;

export type ComputerListQuery = z.infer<typeof computerListQuerySchema>;

/** Uma amostra da série temporal de uso, para o gráfico das últimas horas. */
export const computerSampleSchema = z.object({
  sampledAt: z.string().datetime(),
  cpuPercent: z.number(),
  memoryPercent: z.number(),
  diskPercent: z.number(),
  networkBytesPerSec: z.number(),
});

export type ComputerSample = z.infer<typeof computerSampleSchema>;

/**
 * Um EPISÓDIO de alerta, como a tela o recebe.
 *
 * É um período, não um instante: abre quando a medida passa do limite e fecha quando ela
 * volta (ver `computer-alert.util`). `recoveredAt` nulo é problema acontecendo agora — é essa
 * diferença que a ficha da máquina mostra em vermelho.
 */
export const computerAlertSchema = z.object({
  id: z.number().int(),
  computerId: z.number().int(),
  metric: z.enum(ALERT_METRICS),
  /** O pior valor visto no episódio, não o que o disparou: é ele que diz o tamanho. */
  peakValue: z.number(),
  threshold: z.number(),
  status: z.enum(['active', 'recovered']),
  startedAt: z.string().datetime(),
  recoveredAt: z.string().datetime().nullable(),
  /** O programa que mais consumia a medida no estouro. Palpite honesto, não acusação. */
  causeProcess: z.string().nullable(),
});

export type ComputerAlert = z.infer<typeof computerAlertSchema>;
