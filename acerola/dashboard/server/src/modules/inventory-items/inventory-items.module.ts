import { Module } from '@nestjs/common';

import { StorageModule } from '../../lib/storage/storage.module';
import { InventoryItemsController } from './controller/inventory-items.controller';
import { InventoryItemsRepository } from './repository/inventory-items.repository';
import { InventoryItemsService } from './service/inventory-items.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts` — esquecer é o motivo nº 1 de "a
 * rota dá 404".
 *
 * O `StorageModule` entra porque a foto do produto vive no R2, como o print do chamado.
 */
@Module({
  imports: [StorageModule],
  controllers: [InventoryItemsController],
  providers: [InventoryItemsService, InventoryItemsRepository],
  exports: [InventoryItemsService, InventoryItemsRepository],
})
export class InventoryItemsModule {}
