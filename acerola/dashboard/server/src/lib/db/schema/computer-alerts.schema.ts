import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { computers } from './computers.schema';

/** As três medidas que disparam alerta — as mesmas do monitor do sistema antigo. */
export const ALERT_METRICS = ['cpu', 'memory', 'disk'] as const;

export type AlertMetric = (typeof ALERT_METRICS)[number];

export const ALERT_STATUSES = ['active', 'recovered'] as const;

function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * Quando uma máquina passou do limite, por quanto tempo, e o que provavelmente causou.
 *
 * O alerta é um PERÍODO, não um instante: ele abre quando a medida passa do limite e fecha
 * quando ela volta. Registrar cada leitura acima do limite geraria centenas de linhas para um
 * único episódio de dez minutos, e a pergunta que se faz é "quantas vezes travou e por
 * quanto tempo", não "quantas leituras ruins houve".
 *
 * `causeProcess` é o programa que mais consumia aquela medida no momento do estouro. É um
 * palpite honesto, não uma acusação — por isso o nome diz "causa provável" na tela.
 */
export const computerAlerts = pgTable(
  'computer_alerts',
  {
    id: serial('id').primaryKey(),
    computerId: integer('computer_id')
      .notNull()
      .references(() => computers.id, { onDelete: 'cascade' }),

    metric: text('metric', { enum: ALERT_METRICS }).notNull(),
    /* O pior valor visto durante o episódio, não o que disparou: é ele que diz o tamanho do
       problema. */
    peakValue: doublePrecision('peak_value').notNull(),
    threshold: doublePrecision('threshold').notNull(),

    status: text('status', { enum: ALERT_STATUSES }).notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    /* Nulo enquanto o episódio não terminou — é o que separa "está travada agora" de
       "travou ontem". */
    recoveredAt: timestamp('recovered_at', { withTimezone: true, mode: 'date' }),

    causeProcess: text('cause_process'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('computer_alerts_computer_time_idx').on(table.computerId, table.startedAt.desc()),
    /* "O que está pegando fogo agora" é a pergunta do painel, e ela filtra por situação. */
    index('computer_alerts_status_idx').on(table.status),
    check('computer_alerts_metric_valid', sql`${table.metric} in (${valuesFor(ALERT_METRICS)})`),
    check('computer_alerts_status_valid', sql`${table.status} in (${valuesFor(ALERT_STATUSES)})`),
  ],
);

export type ComputerAlertRow = typeof computerAlerts.$inferSelect;
export type ComputerAlertInsert = typeof computerAlerts.$inferInsert;
