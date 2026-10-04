import { z } from 'zod';

import {
  SERVICE_ORDER_CODE_LENGTH,
  SERVICE_ORDER_HASH_LENGTH,
} from '../domain/service-order.util';
import { TICKET_STATUSES } from '../domain/ticket-status.util';

/**
 * O REGISTRO PÚBLICO de uma ordem de serviço emitida — o que a página de conferência mostra.
 *
 * É pouco de propósito: qualquer pessoa com o link abre esta página. Aqui não entra nome,
 * telefone nem descrição do chamado — só o bastante para quem tem o papel na mão conferir se
 * ele bate com o que o sistema emitiu.
 */
export const publicServiceOrderSchema = z.object({
  /** O código inteiro da emissão. */
  code: z.string().length(SERVICE_ORDER_CODE_LENGTH),
  protocol: z.string(),
  /** 1 na primeira emissão do chamado; sobe a cada emissão depois de uma mudança. */
  version: z.number().int().positive(),
  issuedAt: z.string().datetime(),
  /** O estágio do chamado NO DIA da emissão — não o de hoje. */
  statusAtIssue: z.enum(TICKET_STATUSES),
  /** Quantos históricos o documento traz. */
  historyCount: z.number().int().nonnegative(),
  /** O tempo registrado no documento, em minutos. Nulo quando ninguém informou. */
  totalMinutes: z.number().int().nonnegative().nullable(),
  /** A impressão digital (SHA-256) do arquivo emitido. */
  fileHash: z.string().length(SERVICE_ORDER_HASH_LENGTH),
  /** Esta é a emissão mais recente do chamado? */
  isLatest: z.boolean(),
  latestVersion: z.number().int().positive(),
});

export type PublicServiceOrder = z.infer<typeof publicServiceOrderSchema>;
