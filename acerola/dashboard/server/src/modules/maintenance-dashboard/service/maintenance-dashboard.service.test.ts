import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { type RequestUser } from '../../../lib/auth/request-user.type';
import { type InventoryItemsRepository } from '../../inventory-items/repository/inventory-items.repository';
import { type MaintenanceDashboardRepository } from '../repository/maintenance-dashboard.repository';
import {
  DASHBOARD_WINDOW_DAYS,
  MaintenanceDashboardService,
  RECENT_MOVEMENTS,
} from './maintenance-dashboard.service';

const NOW = new Date('2026-10-05T12:00:00.000Z');

/* Cargo de CONSULTA na Manutenção: é quanto basta para ver o painel. */
const viewer: RequestUser = {
  id: '2',
  email: 'bia@empresa.com.br',
  name: 'Bia',
  role: 'user',
  roles: { infra: 'user', sistema: 'user', manutencao: 'user' },
};

/* Identidade PELA METADE: chegou sem papel. */
const noRole = { ...viewer, role: undefined, roles: undefined } as unknown as RequestUser;

function makeService(
  repository: Partial<MaintenanceDashboardRepository> = {},
  inventory: Partial<InventoryItemsRepository> = {},
) {
  return new MaintenanceDashboardService(
    {
      inventoryTotals: vi.fn().mockResolvedValue({ products: 12, outOfStock: 3 }),
      quoteTotals: vi.fn().mockResolvedValue({
        pending: 2,
        pendingAmountCents: 150000,
        approvedAmountCents: 48000,
      }),
      disposedUnits: vi.fn().mockResolvedValue(5),
      ...repository,
    } as MaintenanceDashboardRepository,
    {
      listMovements: vi.fn().mockResolvedValue({
        rows: [
          {
            movement: {
              id: 9,
              itemId: 1,
              type: 'in',
              quantity: 10,
              balanceAfter: 10,
              reason: null,
              note: null,
              createdAt: new Date('2026-10-04T12:00:00.000Z'),
              createdBy: 'ana@empresa.com.br',
            },
            item: { name: 'Café em pó', unit: 'package' },
          },
        ],
        total: 1,
      }),
      ...inventory,
    } as InventoryItemsRepository,
  );
}

describe('MaintenanceDashboardService.summary', () => {
  // feliz
  it('puts together what Maintenance needs to see when it opens the system', async () => {
    const summary = await makeService().summary(viewer, NOW);

    expect(summary.inventory).toEqual({ products: 12, outOfStock: 3 });
    expect(summary.quotes.pendingAmountCents).toBe(150000);
    expect(summary.disposals.units).toBe(5);
    expect(summary.recentMovements[0]).toMatchObject({ itemName: 'Café em pó', type: 'in' });
  });

  /* "Os últimos 30 dias" contam de AGORA para trás — a mesma janela nas duas contas. */
  it('counts approvals and disposals over the same window of days', async () => {
    const quoteTotals = vi.fn().mockResolvedValue({
      pending: 0,
      pendingAmountCents: 0,
      approvedAmountCents: 0,
    });
    const disposedUnits = vi.fn().mockResolvedValue(0);

    await makeService({ quoteTotals, disposedUnits }).summary(viewer, NOW);

    const since = new Date(NOW.getTime() - DASHBOARD_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    expect(quoteTotals).toHaveBeenCalledWith(since);
    expect(disposedUnits).toHaveBeenCalledWith(since);
  });

  it('asks only for the few last movements', async () => {
    const listMovements = vi.fn().mockResolvedValue({ rows: [], total: 0 });

    const summary = await makeService({}, { listMovements }).summary(viewer, NOW);

    expect(listMovements).toHaveBeenCalledWith({ page: 1, pageSize: RECENT_MOVEMENTS });
    expect(summary.recentMovements).toEqual([]);
  });

  // triste
  it('refuses an unidentified request without counting anything', async () => {
    const inventoryTotals = vi.fn();
    const service = makeService({ inventoryTotals });

    await expect(service.summary(noRole, NOW)).rejects.toThrow(ForbiddenException);
    expect(inventoryTotals).not.toHaveBeenCalled();
  });
});
