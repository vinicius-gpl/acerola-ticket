import { Module } from '@nestjs/common';

import { TicketsController } from './controller/tickets.controller';
import { TicketsRepository } from './repository/tickets.repository';
import { TicketsService } from './service/tickets.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts`.
 */
@Module({
  controllers: [TicketsController],
  providers: [TicketsService, TicketsRepository],
  exports: [TicketsService],
})
export class TicketsModule {}
