import { Module } from '@nestjs/common';

import { TicketAttachmentsController } from './controller/ticket-attachments.controller';
import { TicketHistoriesController } from './controller/ticket-histories.controller';
import { TicketsController } from './controller/tickets.controller';
import { TicketAttachmentsRepository } from './repository/ticket-attachments.repository';
import { TicketHistoriesRepository } from './repository/ticket-histories.repository';
import { TicketsRepository } from './repository/tickets.repository';
import { TicketAccessService } from './service/ticket-access.service';
import { TicketAttachmentsService } from './service/ticket-attachments.service';
import { TicketHistoriesService } from './service/ticket-histories.service';
import { TicketsService } from './service/tickets.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts`.
 */
@Module({
  controllers: [TicketsController, TicketAttachmentsController, TicketHistoriesController],
  providers: [
    TicketsService,
    TicketsRepository,
    TicketAttachmentsService,
    TicketAttachmentsRepository,
    TicketAccessService,
    TicketHistoriesService,
    TicketHistoriesRepository,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
