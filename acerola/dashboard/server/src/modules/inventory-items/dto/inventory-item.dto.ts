import {
  createInventoryItemSchema,
  inventoryItemListQuerySchema,
  inventoryItemSchema,
  updateInventoryItemSchema,
} from '@template/shared/schemas/inventory-item.schema';
import {
  createInventoryMovementSchema,
  inventoryMovementListQuerySchema,
  inventoryMovementSchema,
} from '@template/shared/schemas/inventory-movement.schema';
import { paginatedSchema } from '@template/shared/schemas/pagination.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Os DTOs nascem dos MESMOS schemas Zod que a web importa. É o que garante que a validação
 * em runtime e o contrato publicado no Swagger não possam divergir.
 */
export class InventoryItemDto extends createZodDto(inventoryItemSchema) {}
export class CreateInventoryItemDto extends createZodDto(createInventoryItemSchema) {}
export class UpdateInventoryItemDto extends createZodDto(updateInventoryItemSchema) {}
export class InventoryItemListQueryDto extends createZodDto(inventoryItemListQuerySchema) {}

export class InventoryItemListResponseDto extends createZodDto(
  z.object({
    items: z.array(inventoryItemSchema),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
) {}

/* O DEPÓSITO: cada entrada, saída e descarte de um produto. */
export class InventoryMovementDto extends createZodDto(inventoryMovementSchema) {}
export class CreateInventoryMovementDto extends createZodDto(createInventoryMovementSchema) {}
export class InventoryMovementListQueryDto extends createZodDto(
  inventoryMovementListQuerySchema,
) {}
export class InventoryMovementListResponseDto extends createZodDto(
  paginatedSchema(inventoryMovementSchema),
) {}
