import { bigserial, index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Um campo que mudou: o nome dele, como estava e como ficou. */
export type HistoryChange = { field: string; from: unknown; to: unknown };

/**
 * O HISTÓRICO DO SISTEMA — tudo que mudou dado, por quem, quando e de onde.
 *
 * Diferente de `ticket_histories` (a linha do tempo que quem atende escreve num chamado), esta
 * tabela ninguém escreve à mão: toda requisição que muda dado deixa uma linha aqui sozinha
 * (ver `HistoryInterceptor`).
 *
 * `actor_id` é o id da pessoa no Neon Auth, em texto e sem chave estrangeira: a conta mora no
 * schema do Neon Auth, não nas tabelas do sistema. Nulo é máquina — o bot do WhatsApp, o
 * webhook da rede.
 */
export const history = pgTable(
  'history',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    /** O que foi feito, como `tickets.update` — o módulo e a ação. */
    action: text('action').notNull(),
    actorId: text('actor_id'),
    actorEmail: text('actor_email'),
    /** Em que tipo de coisa: `tickets`, `computers`, `roles`… */
    targetType: text('target_type'),
    targetId: text('target_id'),
    /** Um nome legível do alvo, quando a resposta tem um (protocolo, nome, título). */
    targetLabel: text('target_label'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    changes: jsonb('changes').$type<HistoryChange[]>().notNull().default([]),
    occurredAt: timestamp('occurred_at', { withTimezone: true, precision: 3 })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('history_occurred_at_idx').on(table.occurredAt),
    index('history_target_idx').on(table.targetType, table.targetId),
    index('history_actor_id_idx').on(table.actorId),
  ],
);

export type HistoryRow = typeof history.$inferSelect;
export type HistoryInsert = typeof history.$inferInsert;
