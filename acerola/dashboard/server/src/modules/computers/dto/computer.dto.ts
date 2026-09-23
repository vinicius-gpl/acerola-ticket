import {
  computerAlertSchema,
  computerListQuerySchema,
  computerSampleSchema,
  computerSchema,
  createComputerSchema,
  createdComputerSchema,
  updateComputerSchema,
} from '@template/shared/schemas/computer.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa — é o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class ComputerListQueryDto extends createZodDto(computerListQuerySchema) {}
export class CreateComputerDto extends createZodDto(createComputerSchema) {}
export class UpdateComputerDto extends createZodDto(updateComputerSchema) {}
export class ComputerDto extends createZodDto(computerSchema) {}

/** A resposta do cadastro: é a única vez que o token existe legível. */
export class CreatedComputerDto extends createZodDto(createdComputerSchema) {}

export class ComputerSampleDto extends createZodDto(computerSampleSchema) {}

export class ComputerAlertDto extends createZodDto(computerAlertSchema) {}

export class ComputerListResponseDto extends createZodDto(
  z.object({
    items: z.array(computerSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
) {}
