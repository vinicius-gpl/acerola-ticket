import {
  createTicketHistorySchema,
  ticketHistorySchema,
} from '@template/shared/schemas/ticket-history.schema';
import { createZodDto } from 'nestjs-zod';

/** Os DTOs nascem dos MESMOS schemas Zod que a web importa — ver `ticket.dto.ts`. */
export class TicketHistoryDto extends createZodDto(ticketHistorySchema) {}
export class CreateTicketHistoryDto extends createZodDto(createTicketHistorySchema) {}
