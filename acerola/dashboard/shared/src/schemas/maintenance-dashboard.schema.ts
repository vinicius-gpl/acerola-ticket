import { z } from 'zod';

import { inventoryMovementSchema } from './inventory-movement.schema';

/**
 * O CONTRATO do painel da Manutenção: o que ela precisa ver ao abrir o sistema.
 *
 * Só o que é DELA: o inventário, o depósito e os orçamentos. Os chamados não entram aqui — a
 * tela os busca nos indicadores que a fila de chamados já tem, para o número do painel e o da
 * fila nunca discordarem.
 */
export const maintenanceDashboardSchema = z.object({
  inventory: z.object({
    /** Quantos produtos estão cadastrados. */
    products: z.number().int(),
    /** Quantos estão com saldo zero — o que precisa de reposição, ou de uma entrada esquecida. */
    outOfStock: z.number().int(),
  }),
  quotes: z.object({
    /** Orçamentos esperando decisão, e quanto somam. */
    pending: z.number().int(),
    pendingAmountCents: z.number().int(),
    /** Quanto foi aprovado nos últimos 30 dias. */
    approvedAmountCents: z.number().int(),
  }),
  disposals: z.object({
    /** Quantas unidades foram descartadas nos últimos 30 dias. */
    units: z.number().int(),
  }),
  /** Os últimos movimentos do depósito, do mais novo para o mais velho. */
  recentMovements: z.array(inventoryMovementSchema),
});

export type MaintenanceDashboard = z.infer<typeof maintenanceDashboardSchema>;
