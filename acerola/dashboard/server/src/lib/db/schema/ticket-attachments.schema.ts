import { ATTACHMENT_KINDS } from '@template/shared/domain/attachment-catalog.util';
import { ATTACHMENT_ORIGINS } from '@template/shared/schemas/ticket-attachment.schema';
import { sql } from 'drizzle-orm';
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { ticketHistories } from './ticket-histories.schema';
import { tickets } from './tickets.schema';

/** Monta a lista de valores aceitos para a checagem do banco, a partir da lista do domínio. */
function valuesFor(values: readonly string[]) {
  return sql.raw(values.map((value) => `'${value}'`).join(', '));
}

/**
 * Os ARQUIVOS de um chamado.
 *
 * Tabela própria, e não colunas no chamado, porque a quantidade varia: são até cinco PDFs,
 * cinco imagens, dois vídeos. Como colunas, cada formato novo seria uma migration e um campo
 * vazio em todo chamado que não o usa.
 *
 * O print antigo (`screenshot_key` no chamado) continua onde está: ele nasceu antes e já tem
 * chamados apontando para ele. Migrá-lo para cá seria mexer em dado de gente por capricho de
 * arrumação — os dois convivem, e a tela mostra os dois juntos.
 *
 * **O que fica guardado aqui é o ENDEREÇO no bucket, nunca o arquivo.** E o `file_name` é o
 * nome que veio do computador de quem enviou: ele volta para a tela e vai no download, mas
 * não é endereço de nada (ver `buildObjectKey`).
 */
export const ticketAttachments = pgTable(
  'ticket_attachments',
  {
    id: serial('id').primaryKey(),

    /**
     * O chamado dono do arquivo.
     *
     * `cascade`: chamado não se apaga neste sistema, então isto é rede de segurança e não
     * rotina — mas se um dia um chamado sumir, deixar os arquivos dele órfãos no banco (e
     * pagos no R2) seria pior do que levá-los junto.
     */
    ticketId: integer('ticket_id')
      .notNull()
      .references(() => tickets.id, { onDelete: 'cascade' }),

    /**
     * O HISTÓRICO com o qual o arquivo foi anexado, quando foi junto de um.
     *
     * Nulo é o arquivo do próprio chamado: o que veio com a abertura, ou o que o TI juntou
     * solto. `set null` por coerência com a regra acima — histórico também não se apaga, mas
     * se um dia sumir, o arquivo continua sendo do chamado.
     */
    historyId: integer('history_id').references(() => ticketHistories.id, { onDelete: 'set null' }),

    kind: text('kind', { enum: ATTACHMENT_KINDS }).notNull(),

    /**
     * DE QUEM É O ARQUIVO: de quem abriu o chamado, ou do TI que atendeu.
     *
     * É o que decide quem pode apagá-lo (ver `attachment-ownership.util`). Coluna própria, e
     * não uma leitura de `created_by` estar nulo: os dois coincidem hoje, mas `created_by` é
     * auditoria — no dia em que alguém carimbar o autor também no envio público, a permissão
     * viraria ao contrário, em silêncio.
     *
     * O padrão é `requester` porque é o que as linhas que já existem são: elas nasceram do
     * formulário público, antes de o TI poder anexar.
     */
    origin: text('origin', { enum: ATTACHMENT_ORIGINS }).notNull().default('requester'),
    fileName: text('file_name').notNull(),
    contentType: text('content_type').notNull(),
    /* `bigint`: um vídeo de 50 MB cabe em `int4`, mas o teto pode subir, e um limite que
       estoura silenciosamente no banco é o pior lugar para descobrir isso. */
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),

    /** O endereço dentro do bucket. Sorteado no envio — nunca o nome que o navegador mandou. */
    storageKey: text('storage_key').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull().defaultNow(),
    /**
     * Quem anexou, quando foi alguém do TI.
     *
     * NULO de propósito quando o arquivo veio junto com a abertura do chamado: ali não existe
     * identidade, e carimbar uma diria que alguém do TI anexou o que a pessoa mandou.
     */
    createdBy: text('created_by'),
  },
  (table) => [
    /* A consulta é sempre "os anexos deste chamado". */
    index('ticket_attachments_ticket_idx').on(table.ticketId),
    index('ticket_attachments_history_idx').on(table.historyId),
    check('ticket_attachments_kind_valid', sql`${table.kind} in (${valuesFor(ATTACHMENT_KINDS)})`),
    /* O lado do arquivo decide quem pode apagá-lo, e por isso a checagem é do BANCO: um
       valor inventado aqui viraria um arquivo que ninguém consegue apagar, ou pior, um que
       todo mundo consegue. */
    check(
      'ticket_attachments_origin_valid',
      sql`${table.origin} in (${valuesFor(ATTACHMENT_ORIGINS)})`,
    ),
    /* Arquivo de zero byte é envio que falhou no meio, não arquivo. */
    check('ticket_attachments_size_positive', sql`${table.sizeBytes} > 0`),
  ],
);

export type TicketAttachmentRow = typeof ticketAttachments.$inferSelect;
export type TicketAttachmentInsert = typeof ticketAttachments.$inferInsert;
