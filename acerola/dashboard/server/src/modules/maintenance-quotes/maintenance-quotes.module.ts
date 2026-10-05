import { Module } from '@nestjs/common';

import { StorageModule } from '../../lib/storage/storage.module';
import { MaintenanceQuotesController } from './controller/maintenance-quotes.controller';
import { MaintenanceQuotesRepository } from './repository/maintenance-quotes.repository';
import { MaintenanceQuotesService } from './service/maintenance-quotes.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts` — esquecer é o motivo nº 1 de "a
 * rota dá 404".
 *
 * O `StorageModule` entra porque o documento do orçamento vive no R2, como a foto do
 * inventário.
 */
@Module({
  imports: [StorageModule],
  controllers: [MaintenanceQuotesController],
  providers: [MaintenanceQuotesService, MaintenanceQuotesRepository],
})
export class MaintenanceQuotesModule {}
