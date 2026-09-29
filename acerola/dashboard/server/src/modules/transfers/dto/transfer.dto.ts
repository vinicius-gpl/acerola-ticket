import {
  createTransferSchema,
  installedPartSchema,
  transferSchema,
} from '@template/shared/schemas/transfer.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa — é o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class CreateTransferDto extends createZodDto(createTransferSchema) {}
export class TransferDto extends createZodDto(transferSchema) {}
export class TransferListDto extends createZodDto(z.array(transferSchema)) {}
export class InstalledPartListDto extends createZodDto(z.array(installedPartSchema)) {}
