import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type PublicServiceOrder } from '@template/shared/schemas/service-order.schema';

import {
  type TicketServiceOrderInsert,
  type TicketServiceOrderRow,
} from '../../../lib/db/schema/ticket-service-orders.schema';
import {
  type ServiceOrder,
  type ServiceOrderIssue,
  totalMinutes,
} from '../report/ticket-service-order.pdf';

/** Uma emissão ainda não gravada: tudo o que o documento precisa para ser desenhado. */
export type ServiceOrderDraft = Omit<ServiceOrderIssue, 'webOrigin'>;

/** Uma emissão já gravada, no formato que o desenho do PDF recebe. */
export function toIssue(row: TicketServiceOrderRow, webOrigin: string): ServiceOrderIssue {
  return {
    version: row.version,
    code: row.code,
    issuedAt: row.issuedAt,
    issuedByName: row.issuedByName,
    webOrigin,
  };
}

/**
 * A linha que registra a emissão: a impressão digital do arquivo e o retrato do chamado
 * naquele momento. `issuedBy` vem da sessão — nunca do corpo da requisição.
 */
export function toServiceOrderInsert(
  order: ServiceOrder,
  draft: ServiceOrderDraft,
  fileHash: string,
  issuedBy: string,
): TicketServiceOrderInsert {
  return {
    ticketId: order.ticket.id,
    version: draft.version,
    code: draft.code,
    fileHash,
    statusAtIssue: order.ticket.status,
    historyCount: order.histories.length,
    totalMinutes: totalMinutes(order.histories),
    issuedByName: draft.issuedByName,
    issuedBy,
    issuedAt: draft.issuedAt,
  };
}

/**
 * O que a página PÚBLICA de conferência recebe. De propósito, sem quem emitiu e sem nada do
 * conteúdo do chamado: qualquer pessoa com o link abre isto.
 */
export function toPublicServiceOrder(
  row: TicketServiceOrderRow,
  latestVersion: number,
): PublicServiceOrder {
  return {
    code: row.code,
    protocol: formatTicketProtocol(row.ticketId),
    version: row.version,
    issuedAt: row.issuedAt.toISOString(),
    statusAtIssue: row.statusAtIssue,
    historyCount: row.historyCount,
    totalMinutes: row.totalMinutes,
    fileHash: row.fileHash,
    isLatest: row.version === latestVersion,
    latestVersion,
  };
}
