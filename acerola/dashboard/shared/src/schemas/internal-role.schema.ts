import { z } from 'zod';

import { roleContextSchema, userRoleSchema } from './user.schema';

/**
 * Cargo interno do sistema, desacoplado da entidade/provedor de autenticação.
 *
 * Uma pessoa pode possuir cargos diferentes de acordo com o contexto (área do sistema).
 * Exemplo:
 * - contexto 'infra': 'user'
 * - contexto 'sistema': 'admin'
 * - contexto 'manutencao': 'manager'
 */
export const internalRoleSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().min(1),
  userEmail: z.string().email().nullable().optional(),
  context: roleContextSchema,
  role: userRoleSchema,
  createdAt: z.string().datetime(),
  createdBy: z.string().nullable().optional(),
  updatedAt: z.string().datetime().nullable().optional(),
  updatedBy: z.string().nullable().optional(),
});

export type InternalRole = z.infer<typeof internalRoleSchema>;

/**
 * Dados para atribuir ou alterar o cargo interno de uma pessoa em um determinado contexto.
 */
export const assignRoleSchema = z.object({
  userId: z.string().min(1, 'Identificador é obrigatório'),
  userEmail: z.string().email('E-mail inválido').optional().nullable(),
  context: roleContextSchema,
  role: userRoleSchema,
});

export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
