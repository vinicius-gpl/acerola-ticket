import {
  defaultSeverityOf,
  type NetworkEventType,
} from '@template/shared/domain/network-event.util';
import {
  type NetworkEvent,
  type NetworkWebhookPayload,
} from '@template/shared/schemas/network-event.schema';

import {
  type NetworkEventInsert,
  type NetworkEventRow,
} from '../../../lib/db/schema/network-events.schema';

/** A tradução entre a linha do banco e o contrato. */
export function toNetworkEvent(row: NetworkEventRow): NetworkEvent {
  return {
    id: row.id,
    occurredAt: row.occurredAt.toISOString(),
    type: row.type,
    severity: row.severity,
    title: row.title,
    message: row.message,
    linkName: row.linkName,
    provider: row.provider,
    latencyMs: row.latencyMs,
    packetLossPercent: row.packetLossPercent,
    source: row.source,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    resolvedBy: row.resolvedBy,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * O que chegou do UniFi virando linha.
 *
 * **O corpo inteiro é guardado em `raw`**, inclusive o que este contrato não conhece: o Alarm
 * Manager monta cada alerta de um jeito, e o dia em que um campo novo importar ele vai estar
 * ali — em vez de ter sido descartado na porta de entrada.
 *
 * `occurredAt` sai do corpo quando ele manda, e só então cai para agora: um webhook atrasado
 * não pode fazer uma queda de ontem parecer de agora.
 */
export function toWebhookInsert(
  payload: NetworkWebhookPayload,
  title: string,
  type: NetworkEventType,
): NetworkEventInsert {
  return {
    occurredAt: payload.occurredAt ? new Date(payload.occurredAt) : new Date(),
    type,
    severity: payload.severity ?? defaultSeverityOf(type),
    title,
    message: payload.message ?? payload.text ?? null,
    linkName: payload.linkName ?? payload.wan ?? null,
    provider: payload.provider ?? null,
    latencyMs: payload.latencyMs ?? null,
    packetLossPercent: payload.packetLossPercent ?? null,
    source: 'UniFi',
    raw: payload,
  };
}
