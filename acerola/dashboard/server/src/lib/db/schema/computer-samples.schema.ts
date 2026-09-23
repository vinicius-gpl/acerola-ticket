import {
  bigserial,
  doublePrecision,
  index,
  integer,
  pgTable,
  timestamp,
} from 'drizzle-orm/pg-core';

import { computers } from './computers.schema';

/**
 * A SÉRIE DE USO de cada máquina ao longo do tempo — o que desenha o gráfico das últimas
 * horas.
 *
 * É de propósito uma linha ENXUTA: quatro números e o instante. A leitura completa (processos,
 * volumes, interfaces) fica só a mais recente, em `computers.last_snapshot`. Guardar tudo a
 * cada envio multiplicaria o banco por cem para responder uma pergunta que ninguém faz — nunca
 * se quer saber quais abas do Chrome estavam abertas às 14h32 de três semanas atrás.
 *
 * `on delete cascade` porque uma amostra não existe sem a máquina dela: são medições daquele
 * computador, sem sentido próprio. É o único lugar do sistema onde apagar em cascata é certo,
 * e ainda assim máquina não se apaga — se arquiva.
 */
export const computerSamples = pgTable(
  'computer_samples',
  {
    /* `bigserial`: numa frota de 50 máquinas enviando a cada 30 segundos, `serial` (int4)
       estoura em pouco mais de um ano. */
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    computerId: integer('computer_id')
      .notNull()
      .references(() => computers.id, { onDelete: 'cascade' }),
    sampledAt: timestamp('sampled_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),

    cpuPercent: doublePrecision('cpu_percent').notNull(),
    memoryPercent: doublePrecision('memory_percent').notNull(),
    /* O disco do sistema: é o que enche e trava a máquina, não a soma de todos os volumes. */
    diskPercent: doublePrecision('disk_percent').notNull(),
    networkBytesPerSec: doublePrecision('network_bytes_per_sec').notNull().default(0),
  },
  (table) => [
    /* A consulta do gráfico é sempre "uma máquina, do mais recente para trás". */
    index('computer_samples_computer_time_idx').on(table.computerId, table.sampledAt.desc()),
    /* A limpeza por idade varre por data, sem máquina. */
    index('computer_samples_sampled_at_idx').on(table.sampledAt),
  ],
);

export type ComputerSampleRow = typeof computerSamples.$inferSelect;
export type ComputerSampleInsert = typeof computerSamples.$inferInsert;
