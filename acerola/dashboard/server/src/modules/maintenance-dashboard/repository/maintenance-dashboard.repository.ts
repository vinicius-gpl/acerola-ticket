import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, gte, sql } from 'drizzle-orm';

import { runQuery } from '../../../lib/db/db-error.util';
import { DB } from '../../../lib/db/db.token';
import { type Database } from '../../../lib/db/db.type';
import { inventoryItems } from '../../../lib/db/schema/inventory-items.schema';
import { inventoryMovements } from '../../../lib/db/schema/inventory-movements.schema';
import { maintenanceQuotes } from '../../../lib/db/schema/maintenance-quotes.schema';

export type InventoryTotals = { products: number; outOfStock: number };

export type QuoteTotals = {
  pending: number;
  pendingAmountCents: number;
  approvedAmountCents: number;
};

/**
 * As CONTAS do painel da Manutenção. Só leitura, e só soma: nenhuma regra mora aqui.
 *
 * Cada número é uma consulta agregada — o banco conta, e não a API somando linha por linha:
 * trazer o inventário inteiro para descobrir quantos produtos existem seria pagar por dados
 * que a tela não mostra.
 *
 * `since` chega de fora (o service decide o que é "os últimos 30 dias"), para a conta poder
 * ser testada com uma data fixa.
 */
@Injectable()
export class MaintenanceDashboardRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async inventoryTotals(): Promise<InventoryTotals> {
    const [row] = await runQuery(
      this.db
        .select({
          products: count(),
          outOfStock: sql<number>`count(*) filter (where ${inventoryItems.balance} = 0)`.mapWith(
            Number,
          ),
        })
        .from(inventoryItems),
      'contar o inventário da Manutenção',
    );

    return { products: row?.products ?? 0, outOfStock: row?.outOfStock ?? 0 };
  }

  async quoteTotals(since: Date): Promise<QuoteTotals> {
    /* A condição é montada com `gte(coluna, data)`, e não com a data solta dentro do `sql`:
       é o operador do Drizzle que sabe converter um `Date` para o que a coluna espera. Solta
       no texto da consulta, a data chega crua ao driver, e ele a recusa. */
    const approvedSince = and(
      eq(maintenanceQuotes.status, 'approved'),
      gte(maintenanceQuotes.decidedAt, since),
    );

    const [row] = await runQuery(
      this.db
        .select({
          pending:
            sql<number>`count(*) filter (where ${maintenanceQuotes.status} = 'pending')`.mapWith(
              Number,
            ),
          pendingAmountCents:
            sql<number>`coalesce(sum(${maintenanceQuotes.amountCents}) filter (where ${maintenanceQuotes.status} = 'pending'), 0)`.mapWith(
              Number,
            ),
          approvedAmountCents:
            sql<number>`coalesce(sum(${maintenanceQuotes.amountCents}) filter (where ${approvedSince}), 0)`.mapWith(
              Number,
            ),
        })
        .from(maintenanceQuotes),
      'somar os orçamentos da Manutenção',
    );

    return {
      pending: row?.pending ?? 0,
      pendingAmountCents: row?.pendingAmountCents ?? 0,
      approvedAmountCents: row?.approvedAmountCents ?? 0,
    };
  }

  /** Quantas UNIDADES foram descartadas desde `since` — a soma das quantidades, não das linhas. */
  async disposedUnits(since: Date): Promise<number> {
    const [row] = await runQuery(
      this.db
        .select({
          units: sql<number>`coalesce(sum(${inventoryMovements.quantity}), 0)`.mapWith(Number),
        })
        .from(inventoryMovements)
        .where(
          and(eq(inventoryMovements.type, 'disposal'), gte(inventoryMovements.createdAt, since)),
        ),
      'somar os descartes da Manutenção',
    );

    return row?.units ?? 0;
  }
}
