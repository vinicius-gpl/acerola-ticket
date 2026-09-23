import { Module } from '@nestjs/common';

import { MaintenancesController } from './controller/maintenances.controller';
import { MaintenancesRepository } from './repository/maintenances.repository';
import { MaintenancesService } from './service/maintenances.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts` — esquecer é o motivo nº 1 de "a
 * rota dá 404".
 */
@Module({
  controllers: [MaintenancesController],
  providers: [MaintenancesService, MaintenancesRepository],
  exports: [MaintenancesService],
})
export class MaintenancesModule {}
