import { publicServiceOrderSchema } from '@template/shared/schemas/service-order.schema';
import { createZodDto } from 'nestjs-zod';

/** O DTO nasce do MESMO schema Zod que a web importa — ver `ticket.dto.ts`. */
export class PublicServiceOrderDto extends createZodDto(publicServiceOrderSchema) {}
