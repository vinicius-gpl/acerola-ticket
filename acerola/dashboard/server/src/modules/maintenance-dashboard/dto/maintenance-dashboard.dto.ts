import { maintenanceDashboardSchema } from '@template/shared/schemas/maintenance-dashboard.schema';
import { createZodDto } from 'nestjs-zod';

/** O DTO nasce do MESMO schema Zod que a web importa — runtime e Swagger não divergem. */
export class MaintenanceDashboardDto extends createZodDto(maintenanceDashboardSchema) {}
