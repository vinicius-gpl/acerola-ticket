import { assignRoleSchema, internalRoleSchema } from '@template/shared/schemas/internal-role.schema';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * DTOs para gerenciamento de cargos internos.
 * Nascem dos schemas Zod em `@template/shared` para paridade total entre API e cliente.
 */
export class InternalRoleDto extends createZodDto(internalRoleSchema) {}
export class AssignRoleDto extends createZodDto(assignRoleSchema) {}
export class InternalRoleListDto extends createZodDto(z.array(internalRoleSchema)) {}
