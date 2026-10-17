import {
  uploadRequestSchema,
  uploadTicketSchema,
} from '@template/shared/schemas/staged-file.schema';
import {
  attachFilesSchema,
  ticketAttachmentSchema,
} from '@template/shared/schemas/ticket-attachment.schema';
import { createZodDto } from 'nestjs-zod';

/**
 * O DTO nasce do MESMO schema Zod que a web importa — é o que garante que o Swagger e a
 * validação em runtime não possam divergir.
 */
export class TicketAttachmentDto extends createZodDto(ticketAttachmentSchema) {}

/** O pedido do link de envio: o que a tela sabe do arquivo antes de enviá-lo. */
export class UploadRequestDto extends createZodDto(uploadRequestSchema) {}

/** O link de envio (PUT) e a chave da área temporária. */
export class UploadTicketDto extends createZodDto(uploadTicketSchema) {}

/** Os arquivos já enviados que vão entrar no chamado. */
export class AttachFilesDto extends createZodDto(attachFilesSchema) {}
