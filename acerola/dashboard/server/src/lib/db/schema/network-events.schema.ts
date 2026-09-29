import {
  NETWORK_EVENT_TYPES,
  NETWORK_SEVERITIES,
} from '@template/shared/domain/network-event.util';
import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * OS EVENTOS DE REDE: quedas, lentidão e trocas de link, como o UniFi os avisou.
 *
 * O sistema não mede a rede — ele REGISTRA o que o equipamento mandou pelo webhook. Por isso
 * `occurred_at` (quando aconteceu, segundo o UniFi) é diferente de `created_at` (quando
 * chegou aqui): um webhook atrasado não pode fazer uma queda de ontem parecer de agora.
 *
 * `raw` guarda o corpo inteiro que chegou. O Alarm Manager monta cada alerta de um jeito, e
 * o dia em que um campo novo importar, ele vai estar ali — em vez de ter sido descartado na
 * porta de entrada.
 *
 * Nada aqui se apaga: marcar como resolvido é escrever `resolved_at`, e o evento continua no
 * histórico. "A internet caiu três vezes este mês" é uma pergunta que só o histórico responde.
 */
export const networkEvents = pgTable(
  'network_events',
  {
    id: serial('id').primaryKey(),

    occurredAt: timestamp('occurred_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    type: text('type', { enum: NETWORK_EVENT_TYPES }).notNull(),
    severity: text('severity', { enum: NETWORK_SEVERITIES }).notNull(),

    title: text('title').notNull(),
    message: text('message'),

    linkName: text('link_name'),
    provider: text('provider'),
    latencyMs: doublePrecision('latency_ms'),
    packetLossPercent: doublePrecision('packet_loss_percent'),

    /* De onde veio: "UniFi" pelo webhook, "Manual" quando alguém registrou à mão. */
    source: text('source').notNull().default('UniFi'),

    /* Nulo é problema EM ABERTO — é essa diferença que a tela mostra em vermelho. */
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    resolvedBy: text('resolved_by'),

    raw: jsonb('raw'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    /* A tela abre pela mais recente, sempre. */
    index('network_events_occurred_idx').on(table.occurredAt.desc()),
    /* "O que ainda está em aberto" é a primeira pergunta de quem abre a tela. */
    index('network_events_resolved_idx').on(table.resolvedAt),
    index('network_events_type_idx').on(table.type),
    check('network_events_type_valid', sql`${table.type} in (${valuesFor(NETWORK_EVENT_TYPES)})`),
    check(
      'network_events_severity_valid',
      sql`${table.severity} in (${valuesFor(NETWORK_SEVERITIES)})`,
    ),
  ],
);

export type NetworkEventRow = typeof networkEvents.$inferSelect;
export type NetworkEventInsert = typeof networkEvents.$inferInsert;
