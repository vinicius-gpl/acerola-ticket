import { Module } from '@nestjs/common';

import { InsightsController } from './controller/insights.controller';
import { InsightsRepository } from './repository/insights.repository';
import { InsightsService } from './service/insights.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts` — esquecer é o motivo nº 1 de "a
 * rota dá 404".
 */
@Module({
  controllers: [InsightsController],
  providers: [InsightsService, InsightsRepository],
})
export class InsightsModule {}
