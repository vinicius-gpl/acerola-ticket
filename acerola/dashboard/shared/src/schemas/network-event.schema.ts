import { z } from 'zod';

import { NETWORK_EVENT_TYPES, NETWORK_SEVERITIES } from '../domain/network-event.util';
import { paginationQuerySchema } from './pagination.schema';

/**
 * O CONTRATO dos eventos de rede. Um schema, duas pontas: a API o usa como DTO e Swagger e a
 * web o usa para ler a lista.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const TITLE_MAX_LENGTH = 200;
export const MESSAGE_MAX_LENGTH = 1000;
export const LINK_NAME_MAX_LENGTH = 100;

export const networkEventTypeSchema = z.enum(NETWORK_EVENT_TYPES);
export const networkSeveritySchema = z.enum(NETWORK_SEVERITIES);

export const networkEventSchema = z.object({
  id: z.number().int(),
  /** Quando o evento ACONTECEU, segundo o equipamento — não quando chegou aqui. */
  occurredAt: z.string().datetime(),
  type: networkEventTypeSchema,
  severity: networkSeveritySchema,
  title: z.string(),
  message: z.string().nullable(),
  /** O link de saída: "WAN1", "Fibra Vivo". Nulo quando o aviso não é de um link só. */
  linkName: z.string().nullable(),
  provider: z.string().nullable(),
  latencyMs: z.number().nullable(),
  packetLossPercent: z.number().nullable(),
  /** De onde veio: UniFi, ou "Manual" quando alguém registrou à mão. */
  source: z.string(),
  /**
   * Quando alguém marcou como resolvido. Nulo é problema em aberto — e é essa diferença que
   * a tela mostra em vermelho.
   */
  resolvedAt: z.string().datetime().nullable(),
  resolvedBy: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type NetworkEvent = z.infer<typeof networkEventSchema>;

/**
 * O que o WEBHOOK do UniFi manda.
 *
 * Quase tudo é opcional, e isso é deliberado: o Alarm Manager monta o corpo conforme o
 * alerta, e recusar um aviso porque faltou um campo seria perder justamente o evento de uma
 * queda. O que não vier é preenchido pelo servidor — o tipo sai do texto, a gravidade sai do
 * tipo, e o corpo inteiro fica guardado em `raw` para quem precisar conferir depois.
 */
export const networkWebhookSchema = z
  .object({
    /** O título do alerta, como o UniFi o escreve. É por ele que o tipo é reconhecido. */
    title: z.string().trim().max(TITLE_MAX_LENGTH).optional(),
    alert: z.string().trim().max(TITLE_MAX_LENGTH).optional(),
    event: z.string().trim().max(TITLE_MAX_LENGTH).optional(),
    message: z.string().trim().max(MESSAGE_MAX_LENGTH).optional(),
    text: z.string().trim().max(MESSAGE_MAX_LENGTH).optional(),
    type: networkEventTypeSchema.optional(),
    severity: networkSeveritySchema.optional(),
    linkName: z.string().trim().max(LINK_NAME_MAX_LENGTH).optional(),
    wan: z.string().trim().max(LINK_NAME_MAX_LENGTH).optional(),
    provider: z.string().trim().max(LINK_NAME_MAX_LENGTH).optional(),
    latencyMs: z.coerce.number().nonnegative().optional(),
    packetLossPercent: z.coerce.number().min(0).max(100).optional(),
    occurredAt: z.string().datetime().optional(),
  })
  /* O UniFi manda campos que este contrato não conhece, e eles são guardados em `raw`. */
  .passthrough();

export type NetworkWebhookPayload = z.infer<typeof networkWebhookSchema>;

/** Registrar um evento à mão, para quando a queda não veio pelo UniFi. */
export const createNetworkEventSchema = z.object({
  type: networkEventTypeSchema,
  severity: networkSeveritySchema.optional(),
  title: z
    .string({ required_error: 'Informe o que aconteceu' })
    .trim()
    .min(1, 'Informe o que aconteceu')
    .max(TITLE_MAX_LENGTH, `O título pode ter até ${TITLE_MAX_LENGTH} caracteres`),
  message: z
    .string()
    .trim()
    .max(MESSAGE_MAX_LENGTH, `O detalhe pode ter até ${MESSAGE_MAX_LENGTH} caracteres`)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
  linkName: z
    .string()
    .trim()
    .max(LINK_NAME_MAX_LENGTH, `O nome do link pode ter até ${LINK_NAME_MAX_LENGTH} caracteres`)
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
  occurredAt: z.string().datetime({ message: 'Informe uma data válida' }).optional(),
});

export type CreateNetworkEventInput = z.input<typeof createNetworkEventSchema>;

/** A forma do formulário de registro à mão. */
export const networkEventFormSchema = z.object({
  type: networkEventTypeSchema,
  title: z
    .string()
    .trim()
    .min(1, 'Informe o que aconteceu')
    .max(TITLE_MAX_LENGTH, `Até ${TITLE_MAX_LENGTH} caracteres`),
  message: z.string().max(MESSAGE_MAX_LENGTH, `Até ${MESSAGE_MAX_LENGTH} caracteres`),
  linkName: z.string().max(LINK_NAME_MAX_LENGTH, `Até ${LINK_NAME_MAX_LENGTH} caracteres`),
});

export type NetworkEventFormValues = z.input<typeof networkEventFormSchema>;

export const networkEventListQuerySchema = paginationQuerySchema.extend({
  type: networkEventTypeSchema.optional(),
  severity: networkSeveritySchema.optional(),
  /** Só o que ainda não foi marcado como resolvido. */
  onlyOpen: z.coerce.boolean().optional(),
  /** O recorte de tempo, em dias. */
  days: z.coerce.number().int().min(1).max(365).optional(),
});

export type NetworkEventListQuery = z.infer<typeof networkEventListQuerySchema>;

/**
 * O resumo da rede no período.
 *
 * Calculado a cada consulta, como o do painel: guardar "quantas quedas houve" daria um número
 * que envelhece sozinho.
 */
export const networkSummarySchema = z.object({
  days: z.number().int(),
  /** Eventos em aberto AGORA — sem recorte de tempo, porque é uma fila. */
  open: z.number().int(),
  outages: z.number().int(),
  /** Quanto tempo, somado, a internet ficou fora no período. Nulo se não houve queda. */
  totalOutageSeconds: z.number().int().nullable(),
  worstLatencyMs: z.number().nullable(),
  worstPacketLossPercent: z.number().nullable(),
});

export type NetworkSummary = z.infer<typeof networkSummarySchema>;
