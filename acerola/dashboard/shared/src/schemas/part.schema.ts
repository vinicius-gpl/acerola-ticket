import { z } from 'zod';

import {
  MOVEMENT_TYPES,
  PART_CATEGORIES,
  PART_CONDITIONS,
} from '../domain/part-catalog.util';
import { departmentSchema } from './computer.schema';
import { paginationQuerySchema } from './pagination.schema';

/**
 * O CONTRATO do depósito. Um schema, duas pontas: a API o usa como DTO e Swagger e a web o
 * usa para validar o formulário.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const PART_NAME_MAX_LENGTH = 200;
export const NOTE_MAX_LENGTH = 300;
export const HANDLED_BY_MAX_LENGTH = 200;

/** Ninguém tem mil monitores na prateleira; o teto existe para pegar dedo escorregado. */
export const MAX_MOVEMENT_QUANTITY = 999;

export const partCategorySchema = z.enum(PART_CATEGORIES, {
  errorMap: () => ({ message: 'Escolha uma categoria da lista' }),
});

export const partConditionSchema = z.enum(PART_CONDITIONS, {
  errorMap: () => ({ message: 'Diga se a peça é nova ou usada' }),
});

export const movementTypeSchema = z.enum(MOVEMENT_TYPES, {
  errorMap: () => ({ message: 'A movimentação precisa ser entrada ou saída' }),
});

const partNameSchema = z
  .string({ required_error: 'Informe o que é a peça' })
  .trim()
  .min(1, 'Informe o que é a peça')
  .max(PART_NAME_MAX_LENGTH, `A descrição pode ter até ${PART_NAME_MAX_LENGTH} caracteres`);

const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((value) => (value === '' ? null : value))
    .nullable();

const noteSchema = optionalText(
  NOTE_MAX_LENGTH,
  `A observação pode ter até ${NOTE_MAX_LENGTH} caracteres`,
);

const handledBySchema = optionalText(
  HANDLED_BY_MAX_LENGTH,
  `O nome pode ter até ${HANDLED_BY_MAX_LENGTH} caracteres`,
);

/**
 * Uma peça na prateleira.
 *
 * `balance` NÃO é digitado: é a soma das entradas menos as saídas, mantida pela API a cada
 * movimentação. Por isso ele não aparece em nenhum schema de escrita — deixar alguém
 * digitá-lo faria o número discordar do próprio histórico que o explica.
 */
export const partSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  category: partCategorySchema,
  condition: partConditionSchema,
  balance: z.number().int(),

  createdAt: z.string().datetime(),
  createdBy: z.string(),
  updatedAt: z.string().datetime().nullable(),
  updatedBy: z.string().nullable(),
});

export type Part = z.infer<typeof partSchema>;

/**
 * Cadastrar uma peça.
 *
 * A quantidade inicial é opcional e vira a PRIMEIRA ENTRADA do histórico, não um saldo
 * solto: assim o número da prateleira sempre tem uma linha que o explica.
 */
export const createPartSchema = z.object({
  name: partNameSchema,
  category: partCategorySchema,
  condition: partConditionSchema,
  initialQuantity: z.coerce
    .number({ invalid_type_error: 'A quantidade precisa ser um número' })
    .int('A quantidade precisa ser um número inteiro')
    .min(0, 'A quantidade não pode ser negativa')
    .max(MAX_MOVEMENT_QUANTITY, `A quantidade pode ir até ${MAX_MOVEMENT_QUANTITY}`)
    .optional(),
});

export type CreatePartInput = z.input<typeof createPartSchema>;

/** O que o TI corrige depois: a descrição, a categoria e a condição. Nunca o saldo. */
export const updatePartSchema = z.object({
  name: partNameSchema.optional(),
  category: partCategorySchema.optional(),
  condition: partConditionSchema.optional(),
});

export type UpdatePartInput = z.input<typeof updatePartSchema>;

/** A forma do formulário de peça: tudo texto, porque é o que um campo de tela devolve. */
export const partFormSchema = z.object({
  name: partNameSchema,
  category: partCategorySchema,
  condition: partConditionSchema,
  initialQuantity: z
    .string()
    .regex(/^\d*$/, 'A quantidade precisa ser um número inteiro')
    .refine(
      (value) => value === '' || Number(value) <= MAX_MOVEMENT_QUANTITY,
      `A quantidade pode ir até ${MAX_MOVEMENT_QUANTITY}`,
    ),
});

export type PartFormValues = z.input<typeof partFormSchema>;

/**
 * Uma entrada ou saída, como a tela a recebe.
 *
 * A máquina vem do INVENTÁRIO a cada consulta, e não de uma cópia guardada aqui: máquina
 * renomeada aparece com o nome novo em todo o histórico de peças dela.
 */
export const partMovementSchema = z.object({
  id: z.number().int(),
  partId: z.number().int(),
  partName: z.string(),
  partCondition: partConditionSchema,

  type: movementTypeSchema,
  quantity: z.number().int(),
  /** O saldo da peça DEPOIS desta linha — o extrato, como o de um banco. */
  balanceAfter: z.number().int(),

  /** Para qual máquina a peça foi (ou de qual ela veio). Nulo quando não se aplica. */
  computerId: z.number().int().nullable(),
  computerName: z.string().nullable(),
  computerDisplayName: z.string().nullable(),
  computerDepartment: departmentSchema.nullable(),

  handledBy: z.string().nullable(),
  note: z.string().nullable(),

  createdAt: z.string().datetime(),
  createdBy: z.string(),
  updatedAt: z.string().datetime().nullable(),
  updatedBy: z.string().nullable(),
});

export type PartMovement = z.infer<typeof partMovementSchema>;

export const createMovementSchema = z.object({
  type: movementTypeSchema,
  quantity: z.coerce
    .number({ invalid_type_error: 'A quantidade precisa ser um número' })
    .int('A quantidade precisa ser um número inteiro')
    .min(1, 'A quantidade precisa ser pelo menos 1')
    .max(MAX_MOVEMENT_QUANTITY, `A quantidade pode ir até ${MAX_MOVEMENT_QUANTITY}`),
  computerId: z.number().int().nullable().optional(),
  handledBy: handledBySchema.optional(),
  note: noteSchema.optional(),
});

export type CreateMovementInput = z.input<typeof createMovementSchema>;

/**
 * O que dá para corrigir numa movimentação já registrada: quem pegou e a observação.
 *
 * Quantidade e tipo NÃO entram. Mudá-los reescreveria o saldo de todas as linhas seguintes do
 * extrato, e o histórico deixaria de bater com a prateleira. Movimentação lançada errada se
 * EXCLUI — e a exclusão devolve o saldo.
 */
export const updateMovementSchema = z.object({
  handledBy: handledBySchema.optional(),
  note: noteSchema.optional(),
});

export type UpdateMovementInput = z.input<typeof updateMovementSchema>;

/** A forma do formulário de movimentação. */
export const movementFormSchema = z.object({
  type: movementTypeSchema,
  quantity: z
    .string()
    .min(1, 'Informe a quantidade')
    .regex(/^\d+$/, 'A quantidade precisa ser um número inteiro')
    .refine((value) => Number(value) >= 1, 'A quantidade precisa ser pelo menos 1')
    .refine(
      (value) => Number(value) <= MAX_MOVEMENT_QUANTITY,
      `A quantidade pode ir até ${MAX_MOVEMENT_QUANTITY}`,
    ),
  computerId: z.string(),
  handledBy: z.string().max(HANDLED_BY_MAX_LENGTH, `Até ${HANDLED_BY_MAX_LENGTH} caracteres`),
  note: z.string().max(NOTE_MAX_LENGTH, `Até ${NOTE_MAX_LENGTH} caracteres`),
});

export type MovementFormValues = z.input<typeof movementFormSchema>;

export const partListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  category: partCategorySchema.optional(),
  condition: partConditionSchema.optional(),
  /** Só o que tem peça na prateleira — o que se pergunta antes de sair comprando. */
  inStockOnly: z.coerce.boolean().optional(),
});

export type PartListQuery = z.infer<typeof partListQuerySchema>;

export const movementListQuerySchema = paginationQuerySchema.extend({
  partId: z.coerce.number().int().optional(),
  computerId: z.coerce.number().int().optional(),
  type: movementTypeSchema.optional(),
});

export type MovementListQuery = z.infer<typeof movementListQuerySchema>;
