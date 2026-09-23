import {
  createTicketSchema,
  publicTicketSchema,
  ticketListQuerySchema,
  ticketSchema,
  updateTicketSchema,
} from '@template/shared/schemas/ticket.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa. É o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir — quando divergem, a tela
 * manda um campo que o servidor ignora em silêncio.
 */
export class TicketListQueryDto extends createZodDto(ticketListQuerySchema) {}
export class CreateTicketDto extends createZodDto(createTicketSchema) {}
export class UpdateTicketDto extends createZodDto(updateTicketSchema) {}
export class TicketDto extends createZodDto(ticketSchema) {}

/** O que a consulta pública por protocolo devolve — menos campos, de propósito. */
export class PublicTicketDto extends createZodDto(publicTicketSchema) {}

export class TicketListResponseDto extends createZodDto(
  z.object({
    items: z.array(ticketSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
) {}
