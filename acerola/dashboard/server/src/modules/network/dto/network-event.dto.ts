import {
  createNetworkEventSchema,
  networkEventListQuerySchema,
  networkEventSchema,
  networkSummarySchema,
  networkWebhookSchema,
} from '@template/shared/schemas/network-event.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa — é o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class NetworkEventListQueryDto extends createZodDto(networkEventListQuerySchema) {}
export class CreateNetworkEventDto extends createZodDto(createNetworkEventSchema) {}
export class NetworkEventDto extends createZodDto(networkEventSchema) {}
export class NetworkSummaryDto extends createZodDto(networkSummarySchema) {}

/** O corpo do webhook do UniFi: quase tudo opcional, e o que não se conhece passa junto. */
export class NetworkWebhookDto extends createZodDto(networkWebhookSchema) {}

/** Marcar como resolvido, ou reabrir. Um campo só, e explícito. */
export class ResolveNetworkEventDto extends createZodDto(
  z.object({ isResolved: z.boolean() }),
) {}

export class NetworkEventListResponseDto extends createZodDto(
  z.object({
    items: z.array(networkEventSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
) {}
