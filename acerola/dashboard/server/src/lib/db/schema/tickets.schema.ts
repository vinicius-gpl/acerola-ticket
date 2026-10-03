import {
  TICKET_AREAS,
  TICKET_DEPARTMENTS,
  TICKET_PROBLEM_TYPES,
  type TicketProblemType,
} from '@template/shared/domain/ticket-catalog.util';
import {
  DEFAULT_TICKET_PRIORITY,
  INITIAL_TICKET_STATUS,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '@template/shared/domain/ticket-status.util';
import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { computers } from './computers.schema';

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
    /**
     * A ÁREA de quem atende (#13) — escolhida por quem abre, pelo que PARECE o problema.
     * `default('infra')`: os chamados que existiam antes desta coluna eram todos do molde de
     * Infra (a única área que existia), e um valor padrão evita que a migration os deixe sem
     * área nenhuma.
     */
    area: text('area', { enum: TICKET_AREAS }).notNull().default('infra'),
    department: text('department', { enum: TICKET_DEPARTMENTS }).notNull(),
    problemType: text('problem_type', {
      enum: TICKET_PROBLEM_TYPES as [TicketProblemType, ...TicketProblemType[]],
    }).notNull(),
    anydeskId: text('anydesk_id'),
    contactPhone: text('contact_phone'),
    /* Só avisa quem pediu para ser avisado. Ter o telefone não autoriza usá-lo. */
    notifyWhatsapp: boolean('notify_whatsapp').notNull().default(false),
    description: text('description').notNull(),

    /**
     * A MÁQUINA do chamado — preenchida pelo TI durante o atendimento, nunca por quem abre.
     *
     * Quem pede socorro descreve o problema; descobrir em qual computador ele aconteceu é
     * parte de atender. Pedir isso no formulário público devolveria um campo que a maioria
     * preencheria errado, e um vínculo errado é pior do que vínculo nenhum: é ele que sustenta
     * "esta máquina deu problema demais, vamos trocar" na hora de decidir compra.
     *
     * `set null` ao apagar a máquina: o chamado é o registro de um pedido de gente, e ele não
     * pode sumir porque o computador saiu do inventário.
     */
    computerId: integer('computer_id').references(() => computers.id, { onDelete: 'set null' }),

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
    /* "Os chamados desta área" é a consulta que decide quem enxerga o quê (ver
       `TicketsRepository.contextRolesFor` + `TicketsService.resolveAreaAccess`). */
    index('tickets_area_idx').on(table.area),
    index('tickets_department_idx').on(table.department),
    index('tickets_problem_type_idx').on(table.problemType),
    index('tickets_priority_idx').on(table.priority),
    index('tickets_created_at_idx').on(table.createdAt),
    /* "Os chamados desta máquina" é a consulta da ficha do computador. */
    index('tickets_computer_idx').on(table.computerId),
    /* O `enum` do Drizzle só existe no TypeScript. Estas checagens são o que faz o BANCO
       recusar um valor inventado — inclusive o que chegar por um seed ou pelo Drizzle
       Studio. Elas são geradas das MESMAS listas do domínio que o formulário usa. */
    check('tickets_status_valid', sql`${table.status} in (${valuesFor(TICKET_STATUSES)})`),
    check('tickets_priority_valid', sql`${table.priority} in (${valuesFor(TICKET_PRIORITIES)})`),
    check('tickets_area_valid', sql`${table.area} in (${valuesFor(TICKET_AREAS)})`),
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
