import {
  TICKET_DEPARTMENTS,
  TICKET_PROBLEM_TYPES,
} from '@template/shared/domain/ticket-catalog.util';
import {
  DEFAULT_TICKET_PRIORITY,
  INITIAL_TICKET_STATUS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '@template/shared/domain/ticket-status.util';
import { sql } from 'drizzle-orm';
import { boolean, check, index, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * Chamados de suporte de TI.
 *
 * Duas coisas fogem do molde de `tasks.schema.ts`, e as duas de propósito:
 *
 * 1. **Não existe `createdBy`.** O chamado é aberto por quem não tem login — o formulário é
 *    público. Quem pediu está em `requester_name` e `contact_phone`, digitados pela própria
 *    pessoa. Carimbar uma identidade que não existe seria inventar autoria. `updated_by`,
 *    esse sim, é o e-mail de quem do TI mexeu, e vem sempre da sessão.
 *
 * 2. **Não existe exclusão.** Nenhum caminho do sistema apaga uma linha daqui: o que sai da
 *    fila sai por `status` (`resolved`, `cancelled`). O histórico inteiro é o que sustenta o
 *    tempo médio de atendimento e a memória de quem já pediu o quê — apagar uma linha
 *    falsifica os dois em silêncio, e sem deixar rastro de que falsificou.
 *
 * O número do protocolo (`CH-0007`) é o `id` formatado, não uma coluna: um segundo número
 * precisaria do próprio gerador, e dois geradores acabam colidindo ou pulando — justamente
 * no dado que a pessoa levou anotado num papel.
 */
export const tickets = pgTable(
  'tickets',
  {
    id: serial('id').primaryKey(),
    status: text('status', { enum: TICKET_STATUSES }).notNull().default(INITIAL_TICKET_STATUS),
    priority: text('priority', { enum: TICKET_PRIORITIES })
      .notNull()
      .default(DEFAULT_TICKET_PRIORITY),

    /* Quem pediu — digitado no formulário público, porque não há identidade a consultar. */
    requesterName: text('requester_name').notNull(),
    department: text('department', { enum: TICKET_DEPARTMENTS }).notNull(),
    problemType: text('problem_type', { enum: TICKET_PROBLEM_TYPES }).notNull(),
    anydeskId: text('anydesk_id'),
    contactPhone: text('contact_phone'),
    /* Só avisa quem pediu para ser avisado. Ter o telefone não autoriza usá-lo. */
    notifyWhatsapp: boolean('notify_whatsapp').notNull().default(false),
    description: text('description').notNull(),

    /* O endereço do print DENTRO do bucket, não uma URL. O link é assinado na leitura e
       expira; guardar URL pronta seria guardar um acesso permanente à imagem. */
    screenshotKey: text('screenshot_key'),

    /* O atendimento: quem do TI assumiu e o que foi feito. */
    assignee: text('assignee'),
    solution: text('solution'),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    /* Quando o TI assumiu e quando resolveu. São o que o indicador de tempo médio mede —
       por isso são carimbos próprios, e não deduções a partir de `updated_at`, que qualquer
       edição de texto moveria. */
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'date' }),
    resolvedAt: timestamp('resolved_at', { withTimezone: true, mode: 'date' }),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }),
    updatedBy: text('updated_by'),
  },
  (table) => [
    index('tickets_status_idx').on(table.status),
    index('tickets_department_idx').on(table.department),
    index('tickets_problem_type_idx').on(table.problemType),
    index('tickets_priority_idx').on(table.priority),
    index('tickets_created_at_idx').on(table.createdAt),
    /* O `enum` do Drizzle só existe no TypeScript. Estas checagens são o que faz o BANCO
       recusar um valor inventado — inclusive o que chegar por um seed ou pelo Drizzle
       Studio. Elas são geradas das MESMAS listas do domínio que o formulário usa. */
    check('tickets_status_valid', sql`${table.status} in (${valuesFor(TICKET_STATUSES)})`),
    check('tickets_priority_valid', sql`${table.priority} in (${valuesFor(TICKET_PRIORITIES)})`),
    check(
      'tickets_department_valid',
      sql`${table.department} in (${valuesFor(TICKET_DEPARTMENTS)})`,
    ),
    check(
      'tickets_problem_type_valid',
      sql`${table.problemType} in (${valuesFor(TICKET_PROBLEM_TYPES)})`,
    ),
  ],
);

export type TicketRow = typeof tickets.$inferSelect;
export type TicketInsert = typeof tickets.$inferInsert;
