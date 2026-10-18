import {
  WHATSAPP_NOTICE_FAILURES,
  WHATSAPP_NOTICE_STATUSES,
} from '@template/shared/schemas/whatsapp-notice.schema';
import { sql } from 'drizzle-orm';
import { check, index, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * O número de WhatsApp que cada pessoa vinculou — o "metadado" do usuário.
 *
 * Aqui fica só o que o sistema precisa SABER: quem vinculou, qual número e desde quando. A
 * conexão em si (as chaves que deixam mandar mensagem pelo número) NÃO fica nesta tabela nem
 * neste banco: mora cifrada dentro do bot, que é o único que a usa.
 *
 * A identidade continua vindo do autenticador da instalação, e por isso `user_id` é texto sem
 * chave estrangeira — o mesmo desenho de `github_connections`.
 */
export const whatsappConnections = pgTable('whatsapp_connections', {
  userId: text('user_id').primaryKey(),
  /** Só dígitos, com DDI. */
  phone: text('phone').notNull(),
  /**
   * O nome de quem vinculou, como estava no login. É a assinatura de toda mensagem do bot
   * ("*Ana Lima BOT*"), e fica aqui para o bot assinar sem consultar a conta a cada envio.
   */
  operatorName: text('operator_name'),
  linkedAt: timestamp('linked_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
});

export type WhatsappConnectionRow = typeof whatsappConnections.$inferSelect;

/**
 * Os textos do bot que o super admin trocou. Só entra aqui o que foi EDITADO: mensagem sem
 * linha usa o texto original, que mora no código (`whatsapp-template.util`, em shared).
 */
export const whatsappTemplates = pgTable('whatsapp_templates', {
  key: text('key').primaryKey(),
  body: text('body').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  updatedBy: text('updated_by'),
});

export type WhatsappTemplateRow = typeof whatsappTemplates.$inferSelect;

function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * Cada mensagem automática pelo número de alguém — e a FILA DE SAÍDA dos avisos de chamado.
 *
 * Serve a três coisas: é a CONTAGEM do limite diário por pessoa (o que protege o número de um
 * bloqueio), é o rastro de quem mandou o quê, por qual chamado, e é a fila (padrão outbox): o
 * aviso entra aqui como `pending` e o `WhatsappOutboxService` o entrega, tentando de novo
 * enquanto não sai.
 *
 * O texto (`body`) só fica guardado enquanto a mensagem não saiu — é o que o entregador manda.
 * Saiu, ele é apagado: depois disso, o rastro é só o tipo e para quem.
 *
 * As respostas da conversa (`/chamado`, `/acesso`) não passam pela fila: o bot as entrega na
 * hora, e elas entram aqui já `sent`, só para contar.
 */
export const whatsappMessages = pgTable(
  'whatsapp_messages',
  {
    id: serial('id').primaryKey(),
    /** De quem é o número que envia. */
    senderUserId: text('sender_user_id').notNull(),
    /** O chamado que gerou a mensagem, quando há um. */
    ticketId: integer('ticket_id'),
    /** O tipo: a chave do modelo (`ticket_ready`, `intake_link`…). */
    kind: text('kind').notNull(),
    recipient: text('recipient').notNull(),
    /* O padrão é `sent` porque é o que toda linha anterior à fila era: mensagem que saiu. */
    status: text('status', { enum: WHATSAPP_NOTICE_STATUSES }).notNull().default('sent'),
    body: text('body'),
    attempts: integer('attempts').notNull().default(0),
    /** Quando o entregador pode pegar de novo. Nulo fora da fila. */
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true, mode: 'date' }),
    /** Depois disso, desiste (`failed`, motivo `expired`). */
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    /** Quando saiu — é por ela que o limite do dia conta. */
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
    failureReason: text('failure_reason', { enum: WHATSAPP_NOTICE_FAILURES }),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    index('whatsapp_messages_sender_created_idx').on(table.senderUserId, table.createdAt),
    index('whatsapp_messages_sender_sent_idx').on(table.senderUserId, table.sentAt),
    index('whatsapp_messages_queue_idx').on(table.status, table.nextAttemptAt),
    index('whatsapp_messages_ticket_idx').on(table.ticketId),
    check(
      'whatsapp_messages_status_valid',
      sql`${table.status} in (${valuesFor(WHATSAPP_NOTICE_STATUSES)})`,
    ),
    check(
      'whatsapp_messages_failure_reason_valid',
      sql`${table.failureReason} is null or ${table.failureReason} in (${valuesFor(WHATSAPP_NOTICE_FAILURES)})`,
    ),
  ],
);

export type WhatsappMessageRow = typeof whatsappMessages.$inferSelect;
