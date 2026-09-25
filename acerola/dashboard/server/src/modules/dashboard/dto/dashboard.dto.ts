import {
  dashboardQuerySchema,
  dashboardSchema,
} from '@template/shared/schemas/dashboard.schema';
import { createZodDto } from 'nestjs-zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa — é o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class DashboardQueryDto extends createZodDto(dashboardQuerySchema) {}
export class DashboardDto extends createZodDto(dashboardSchema) {}
