import { Module } from '@nestjs/common';

import { TicketAttachmentsController } from './controller/ticket-attachments.controller';
import { TicketsController } from './controller/tickets.controller';
import { TicketAttachmentsRepository } from './repository/ticket-attachments.repository';
import { TicketsRepository } from './repository/tickets.repository';
import { TicketAttachmentsService } from './service/ticket-attachments.service';
import { TicketsService } from './service/tickets.service';

/**
 * O índice da pasta: é o único arquivo fora das subpastas, e aponta para todo o resto.
 * Módulo novo precisa ser registrado em `app.module.ts`.
 */
@Module({
  controllers: [TicketsController, TicketAttachmentsController],
  providers: [
    TicketsService,
    TicketsRepository,
    TicketAttachmentsService,
    TicketAttachmentsRepository,
  ],
  exports: [TicketsService],
})
export class TicketsModule {}
