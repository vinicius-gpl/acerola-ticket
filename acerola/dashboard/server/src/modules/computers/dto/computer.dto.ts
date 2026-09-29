import {
  computerAlertSchema,
  computerListQuerySchema,
  computerReportQuerySchema,
  computerSampleSchema,
  computerListItemSchema,
  computerSchema,
  createComputerSchema,
  createdComputerSchema,
  disposeComputerSchema,
  updateComputerSchema,
} from '@template/shared/schemas/computer.schema';
import { computerLiveResponseSchema } from '@template/shared/schemas/computer-live.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa — é o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class ComputerListQueryDto extends createZodDto(computerListQuerySchema) {}
export class ComputerReportQueryDto extends createZodDto(computerReportQuerySchema) {}
export class CreateComputerDto extends createZodDto(createComputerSchema) {}
export class UpdateComputerDto extends createZodDto(updateComputerSchema) {}
export class ComputerDto extends createZodDto(computerSchema) {}

/** A resposta do cadastro: é a única vez que o token existe legível. */
export class CreatedComputerDto extends createZodDto(createdComputerSchema) {}

export class ComputerSampleDto extends createZodDto(computerSampleSchema) {}

export class ComputerAlertDto extends createZodDto(computerAlertSchema) {}

/**
 * A leitura ao vivo vai DENTRO de um objeto, e não solta: a resposta precisa poder dizer
 * "não há nenhuma" (`live: null`), e um corpo `null` puro não tem onde documentar isso no
 * Swagger nem como crescer depois sem quebrar quem já lê.
 */
export class ComputerLiveDto extends createZodDto(computerLiveResponseSchema) {}

/** O descarte: tipo e motivo. A data é do servidor, e por isso não entra no corpo. */
export class DisposeComputerDto extends createZodDto(disposeComputerSchema) {}

export class ComputerListResponseDto extends createZodDto(
  z.object({
    items: z.array(computerListItemSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
) {}
