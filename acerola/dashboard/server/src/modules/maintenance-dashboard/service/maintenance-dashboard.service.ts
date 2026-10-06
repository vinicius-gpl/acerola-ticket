import { Injectable } from '@nestjs/common';
import { type MaintenanceDashboard } from '@template/shared/schemas/maintenance-dashboard.schema';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { assertCanRead } from '../../../lib/policy/policy-assert.util';
import { toInventoryMovement } from '../../inventory-items/mapper/inventory-items.mapper';
import { InventoryItemsRepository } from '../../inventory-items/repository/inventory-items.repository';
import { MaintenanceDashboardRepository } from '../repository/maintenance-dashboard.repository';

/** "Os últimos 30 dias": a janela do que foi aprovado e do que foi descartado. */
export const DASHBOARD_WINDOW_DAYS = 30;

/** Quantos movimentos recentes o painel mostra — o que cabe sem virar outra tela. */
export const RECENT_MOVEMENTS = 6;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * O painel da Manutenção: o que ela precisa ver ao abrir o sistema.
 *
 * Só leitura. Quem tem qualquer cargo no sistema consulta — é a mesma régua da leitura do
 * inventário e dos orçamentos, que são os números que o painel resume.
 *
 * Os movimentos recentes vêm do repository do inventário, e não de uma consulta nova aqui:
 * o painel e a tela de Depósito mostrando o mesmo extrato por dois caminhos é pedir para os
 * dois discordarem um dia.
 */
@Injectable()
export class MaintenanceDashboardService {
  constructor(
    private readonly repository: MaintenanceDashboardRepository,
    private readonly inventory: InventoryItemsRepository,
  ) {}

  async summary(user: RequestUser, now: Date = new Date()): Promise<MaintenanceDashboard> {
    assertCanRead(user.role, 'o painel da Manutenção');

    const since = new Date(now.getTime() - DASHBOARD_WINDOW_DAYS * DAY_MS);

    const [inventory, quotes, units, recent] = await Promise.all([
      this.repository.inventoryTotals(),
      this.repository.quoteTotals(since),
      this.repository.disposedUnits(since),
      this.inventory.listMovements({ page: 1, pageSize: RECENT_MOVEMENTS }),
    ]);

    return {
      inventory,
      quotes,
      disposals: { units },
      recentMovements: recent.rows.map(toInventoryMovement),
    };
  }
}
