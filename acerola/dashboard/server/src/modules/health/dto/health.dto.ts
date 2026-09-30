import { healthStatusSchema } from '@template/shared/schemas/health.schema';
import { createZodDto } from 'nestjs-zod';

/** Nasce do MESMO schema que o resto do projeto importa — um contrato, não dois. */
export class HealthStatusDto extends createZodDto(healthStatusSchema) {}
