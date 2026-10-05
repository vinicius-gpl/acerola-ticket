import { Module } from '@nestjs/common';

import { InventoryItemsModule } from '../inventory-items/inventory-items.module';
import { MaintenanceDashboardController } from './controller/maintenance-dashboard.controller';
import { MaintenanceDashboardRepository } from './repository/maintenance-dashboard.repository';
import { MaintenanceDashboardService } from './service/maintenance-dashboard.service';

/**
 * O índice da pasta. Registrado em `app.module.ts`.
 *
 * O `InventoryItemsModule` entra porque os movimentos recentes do painel vêm do mesmo
 * repository que a tela de Depósito usa.
 */
@Module({
  imports: [InventoryItemsModule],
  controllers: [MaintenanceDashboardController],
  providers: [MaintenanceDashboardService, MaintenanceDashboardRepository],
})
export class MaintenanceDashboardModule {}
