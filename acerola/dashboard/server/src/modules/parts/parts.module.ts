import { Module } from '@nestjs/common';

import { PartsController } from './controller/parts.controller';
import { PartsRepository } from './repository/parts.repository';
import { PartsService } from './service/parts.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts` — esquecer é o motivo nº 1 de "a
 * rota dá 404".
 */
@Module({
  controllers: [PartsController],
  providers: [PartsService, PartsRepository],
  exports: [PartsService],
})
export class PartsModule {}
