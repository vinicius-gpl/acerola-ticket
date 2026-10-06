import { type QuoteStatus } from '@template/shared/domain/maintenance-quote.util';
import {
  type CreateMaintenanceQuoteInput,
  type MaintenanceQuote,
  type UpdateMaintenanceQuoteInput,
} from '@template/shared/schemas/maintenance-quote.schema';

import { setIfDefined } from '../../../lib/db/partial-update.util';
import {
  type MaintenanceQuoteInsert,
  type MaintenanceQuoteRow,
} from '../../../lib/db/schema/maintenance-quotes.schema';

/** O documento guardado: a chave no R2 e o nome que o arquivo tinha em quem enviou. */
export type StoredAttachment = { key: string; name: string };

/**
 * A tradução entre a linha do banco e o contrato.
 *
 * `attachmentUrl` chega PRONTO de quem chamou: o link é assinado pelo storage a cada leitura
 * e expira, então não pode ser calculado aqui — o mapper é síncrono e puro, e é o que o torna
 * testável sem subir nada.
 */
export function toMaintenanceQuote(
  row: MaintenanceQuoteRow,
  attachmentUrl: string | null,
): MaintenanceQuote {
  return {
    id: row.id,
    supplier: row.supplier,
    description: row.description,
    kind: row.kind,
    amountCents: row.amountCents,
    quotedOn: row.quotedOn,
    status: row.status,
    note: row.note,
    attachmentUrl,
    /* Sem link não há o que baixar: mostrar o nome de um arquivo inalcançável é prometer. */
    attachmentName: attachmentUrl ? row.attachmentName : null,

    createdAt: row.createdAt.toISOString(),
    createdBy: row.createdBy,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedBy: row.updatedBy,
  };
}

/** O orçamento novo. A autoria vem da identidade, nunca do corpo (CONTRIBUTING §8). */
export function toMaintenanceQuoteInsert(
  input: CreateMaintenanceQuoteInput,
  actorEmail: string,
  attachment: StoredAttachment | null,
  now: Date = new Date(),
): MaintenanceQuoteInsert {
  const status = input.status ?? 'pending';

  return {
    supplier: input.supplier.trim(),
    description: input.description.trim(),
    kind: input.kind,
    amountCents: Number(input.amountCents),
    quotedOn: input.quotedOn,
    status,
    decidedAt: decidedAtFor(status, now),
    note: textOrNull(input.note) ?? null,
    attachmentKey: attachment?.key ?? null,
    attachmentName: attachment?.name ?? null,
    createdBy: actorEmail,
  };
}

/**
 * O que mudou — e só o que mudou (`setIfDefined` separa "não mandou" de "mandou vazio").
 *
 * O documento tem três caminhos: não mexer (nada vem), trocar (`attachment` com o arquivo
 * novo) e tirar (`removeAttachment`, que grava nulo).
 *
 * `decidedAt` acompanha a SITUAÇÃO: marca quando o orçamento saiu de "aguardando", e volta a
 * nulo se ele voltar. A data só anda quando a situação muda de fato — corrigir um erro de
 * digitação num orçamento aprovado em março não o faz parecer aprovado hoje.
 */
export function toMaintenanceQuoteUpdate(
  input: UpdateMaintenanceQuoteInput,
  actorEmail: string,
  current: { status: QuoteStatus },
  attachment?: StoredAttachment,
  now: Date = new Date(),
): Partial<MaintenanceQuoteInsert> {
  const values: Partial<MaintenanceQuoteInsert> = { updatedAt: now, updatedBy: actorEmail };

  setIfDefined(values, 'supplier', input.supplier?.trim());
  setIfDefined(values, 'description', input.description?.trim());
  setIfDefined(values, 'kind', input.kind);
  setIfDefined(values, 'amountCents', amountOrUndefined(input.amountCents));
  setIfDefined(values, 'quotedOn', input.quotedOn);
  setIfDefined(values, 'note', textOrNull(input.note));

  if (input.status !== undefined && input.status !== current.status) {
    values.status = input.status;
    values.decidedAt = decidedAtFor(input.status, now);
  }

  if (attachment) {
    values.attachmentKey = attachment.key;
    values.attachmentName = attachment.name;
  }
  if (input.removeAttachment) {
    values.attachmentKey = null;
    values.attachmentName = null;
  }

  return values;
}

/** Aguardando ainda não foi decidido; qualquer outra situação foi decidida agora. */
function decidedAtFor(status: QuoteStatus, now: Date): Date | null {
  return status === 'pending' ? null : now;
}

/** O contrato já entrega o valor como número; ausente continua ausente. */
function amountOrUndefined(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Number(value);
}

/** Texto em branco vira nulo; ausente continua ausente, para o `setIfDefined` decidir. */
function textOrNull(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();

  return trimmed === '' ? null : trimmed;
}
