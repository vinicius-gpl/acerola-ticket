import {
  createMaintenanceQuoteSchema,
  maintenanceQuoteListQuerySchema,
  maintenanceQuoteSchema,
  updateMaintenanceQuoteSchema,
} from '@template/shared/schemas/maintenance-quote.schema';
import { paginatedSchema } from '@template/shared/schemas/pagination.schema';
import { createZodDto } from 'nestjs-zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa. É o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class MaintenanceQuoteDto extends createZodDto(maintenanceQuoteSchema) {}
export class CreateMaintenanceQuoteDto extends createZodDto(createMaintenanceQuoteSchema) {}
export class UpdateMaintenanceQuoteDto extends createZodDto(updateMaintenanceQuoteSchema) {}
export class MaintenanceQuoteListQueryDto extends createZodDto(maintenanceQuoteListQuerySchema) {}
export class MaintenanceQuoteListResponseDto extends createZodDto(
  paginatedSchema(maintenanceQuoteSchema),
) {}
