import { z } from 'zod';

import { INVENTORY_UNITS } from '../domain/inventory-catalog.util';
import { DISPOSAL_REASONS, STOCK_MOVEMENT_TYPES } from '../domain/inventory-stock.util';
import { paginationQuerySchema } from './pagination.schema';

/**
 * O CONTRATO do depósito da Manutenção: cada entrada, saída e descarte de um produto.
 *
 * Uma linha aqui NÃO se corrige nem se apaga: é o extrato. Lançou errado, lança o movimento
 * contrário — do jeito que um banco estorna, e pelo mesmo motivo: um extrato que muda depois
 * não prova nada.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const INVENTORY_MOVEMENT_NOTE_MAX_LENGTH = 300;

export const stockMovementTypeSchema = z.enum(STOCK_MOVEMENT_TYPES, {
  errorMap: () => ({ message: 'Escolha entrada, saída ou descarte' }),
});

export const disposalReasonSchema = z.enum(DISPOSAL_REASONS, {
  errorMap: () => ({ message: 'Escolha o motivo do descarte' }),
});

const NOTE_TOO_LONG = `A observação pode ter até ${INVENTORY_MOVEMENT_NOTE_MAX_LENGTH} caracteres`;
const REASON_REQUIRED = 'Escolha o motivo do descarte';

/** Um movimento, como a tela o recebe — já com o nome do produto, para a lista não ir buscar. */
export const inventoryMovementSchema = z.object({
  id: z.number().int(),
  itemId: z.number().int(),
  itemName: z.string(),
  itemUnit: z.enum(INVENTORY_UNITS),

  type: stockMovementTypeSchema,
  quantity: z.number().int(),
  /** O saldo do produto DEPOIS desta linha — o extrato, como o de um banco. */
  balanceAfter: z.number().int(),
  /** Só existe no descarte. */
  reason: disposalReasonSchema.nullable(),
  note: z.string().nullable(),

  createdAt: z.string().datetime(),
  createdBy: z.string(),
});

export type InventoryMovement = z.infer<typeof inventoryMovementSchema>;

/**
 * Registrar um movimento. O PRODUTO vem do endereço (`/inventory-items/:id/movements`), não
 * do corpo — e o motivo é obrigatório no descarte, e só nele.
 */
export const createInventoryMovementSchema = z
  .object({
    type: stockMovementTypeSchema,
    quantity: z.coerce
      .number({ invalid_type_error: 'A quantidade precisa ser um número' })
      .int('A quantidade precisa ser um número inteiro')
      .min(1, 'A quantidade precisa ser pelo menos 1'),
    reason: disposalReasonSchema.nullable().optional(),
    note: z
      .string()
      .trim()
      .max(INVENTORY_MOVEMENT_NOTE_MAX_LENGTH, NOTE_TOO_LONG)
      .transform((value) => (value === '' ? null : value))
      .nullable()
      .optional(),
  })
  .superRefine((value, context) => {
    if (value.type !== 'disposal') return;
    if (value.reason) return;

    context.addIssue({ code: 'custom', path: ['reason'], message: REASON_REQUIRED });
  });

export type CreateInventoryMovementInput = z.input<typeof createInventoryMovementSchema>;

export const inventoryMovementListQuerySchema = paginationQuerySchema.extend({
  itemId: z.coerce.number().int().optional(),
  type: stockMovementTypeSchema.optional(),
});

export type InventoryMovementListQuery = z.infer<typeof inventoryMovementListQuerySchema>;

/**
 * A forma do FORMULÁRIO: tudo texto, porque é o que um campo de tela devolve. O produto entra
 * aqui (`itemId`) porque no descarte é a pessoa quem escolhe de qual produto está falando.
 */
export const inventoryMovementFormSchema = z
  .object({
    itemId: z.string().min(1, 'Escolha o produto'),
    type: stockMovementTypeSchema,
    quantity: z
      .string()
      .min(1, 'Informe a quantidade')
      .regex(/^\d+$/, 'A quantidade precisa ser um número inteiro')
      .refine((value) => Number(value) >= 1, 'A quantidade precisa ser pelo menos 1'),
    reason: z.string(),
    note: z.string().trim().max(INVENTORY_MOVEMENT_NOTE_MAX_LENGTH, NOTE_TOO_LONG),
  })
  .superRefine((value, context) => {
    if (value.type !== 'disposal') return;
    if (value.reason !== '') return;

    context.addIssue({ code: 'custom', path: ['reason'], message: REASON_REQUIRED });
  });

export type InventoryMovementFormValues = z.input<typeof inventoryMovementFormSchema>;
