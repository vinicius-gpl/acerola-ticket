import { Module } from '@nestjs/common';

import { HealthController } from './controller/health.controller';
import { HealthRepository } from './repository/health.repository';
import { HealthService } from './service/health.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts` — esquecer é o motivo nº 1 de "a
 * rota dá 404".
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService, HealthRepository],
})
export class HealthModule {}
