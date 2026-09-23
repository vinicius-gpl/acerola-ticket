import {
  createMovementSchema,
  createPartSchema,
  movementListQuerySchema,
  partListQuerySchema,
  partMovementSchema,
  partSchema,
  updateMovementSchema,
  updatePartSchema,
} from '@template/shared/schemas/part.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa — é o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class PartListQueryDto extends createZodDto(partListQuerySchema) {}
export class CreatePartDto extends createZodDto(createPartSchema) {}
export class UpdatePartDto extends createZodDto(updatePartSchema) {}
export class PartDto extends createZodDto(partSchema) {}

export class MovementListQueryDto extends createZodDto(movementListQuerySchema) {}
export class CreateMovementDto extends createZodDto(createMovementSchema) {}
export class UpdateMovementDto extends createZodDto(updateMovementSchema) {}
export class PartMovementDto extends createZodDto(partMovementSchema) {}

export class PartListResponseDto extends createZodDto(
  z.object({
    items: z.array(partSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
) {}

export class MovementListResponseDto extends createZodDto(
  z.object({
    items: z.array(partMovementSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
) {}
