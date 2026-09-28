import { ticketAttachmentSchema } from '@template/shared/schemas/ticket-attachment.schema';
import { createZodDto } from 'nestjs-zod';

/**
 * O DTO nasce do MESMO schema Zod que a web importa — é o que garante que o Swagger e a
 * validação em runtime não possam divergir.
 */
export class TicketAttachmentDto extends createZodDto(ticketAttachmentSchema) {}
