import { z } from 'zod';

import { QUOTE_KINDS, QUOTE_STATUSES, parseAmountToCents } from '../domain/maintenance-quote.util';
import { paginationQuerySchema } from './pagination.schema';

/**
 * O CONTRATO dos orçamentos da Manutenção. Um schema, duas pontas: a API o usa como DTO e
 * Swagger, e a tela o usa para validar o formulário.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const QUOTE_SUPPLIER_MAX_LENGTH = 120;
export const QUOTE_DESCRIPTION_MAX_LENGTH = 500;
export const QUOTE_NOTE_MAX_LENGTH = 500;

/** R$ 99.999.999,99 — acima disso é erro de digitação, não orçamento de manutenção. */
export const QUOTE_AMOUNT_MAX_CENTS = 9_999_999_999;

export const quoteKindSchema = z.enum(QUOTE_KINDS, {
  errorMap: () => ({ message: 'Escolha se é produto, serviço ou outro' }),
});

export const quoteStatusSchema = z.enum(QUOTE_STATUSES, {
  errorMap: () => ({ message: 'Escolha a situação do orçamento' }),
});

const SUPPLIER_REQUIRED = 'Informe a empresa que fez o orçamento';
const DESCRIPTION_REQUIRED = 'Descreva o que foi orçado';
const AMOUNT_INVALID = 'Informe o valor em reais, como 1.250,00';
const AMOUNT_TOO_HIGH = 'O valor passa do limite. Confira se digitou certo.';
const DATE_INVALID = 'Informe a data do orçamento';
const NOTE_TOO_LONG = `A observação pode ter até ${QUOTE_NOTE_MAX_LENGTH} caracteres`;

const supplierSchema = z
  .string({ required_error: SUPPLIER_REQUIRED })
  .trim()
  .min(1, SUPPLIER_REQUIRED)
  .max(QUOTE_SUPPLIER_MAX_LENGTH, `A empresa pode ter até ${QUOTE_SUPPLIER_MAX_LENGTH} caracteres`);

const descriptionSchema = z
  .string({ required_error: DESCRIPTION_REQUIRED })
  .trim()
  .min(1, DESCRIPTION_REQUIRED)
  .max(
    QUOTE_DESCRIPTION_MAX_LENGTH,
    `A descrição pode ter até ${QUOTE_DESCRIPTION_MAX_LENGTH} caracteres`,
  );

const amountCentsSchema = z.coerce
  .number({ invalid_type_error: AMOUNT_INVALID })
  .int(AMOUNT_INVALID)
  .min(0, AMOUNT_INVALID)
  .max(QUOTE_AMOUNT_MAX_CENTS, AMOUNT_TOO_HIGH);

/** O dia do orçamento, sem hora: `2026-10-05`. É o que está escrito no documento. */
const quotedOnSchema = z
  .string({ required_error: DATE_INVALID })
  .regex(/^\d{4}-\d{2}-\d{2}$/, DATE_INVALID);

const noteSchema = z
  .string()
  .trim()
  .max(QUOTE_NOTE_MAX_LENGTH, NOTE_TOO_LONG)
  .transform((value) => (value === '' ? null : value))
  .nullable();

/**
 * Um orçamento, como a tela o recebe.
 *
 * `attachmentUrl` é um link ASSINADO e temporário para o documento no R2, gerado a cada
 * leitura — a chave do arquivo nunca sai do servidor, como a foto do inventário.
 */
export const maintenanceQuoteSchema = z.object({
  id: z.number().int(),
  supplier: z.string(),
  description: z.string(),
  kind: quoteKindSchema,
  amountCents: z.number().int(),
  quotedOn: z.string(),
  status: quoteStatusSchema,
  note: z.string().nullable(),
  attachmentUrl: z.string().nullable(),
  attachmentName: z.string().nullable(),

  createdAt: z.string().datetime(),
  createdBy: z.string(),
  updatedAt: z.string().datetime().nullable(),
  updatedBy: z.string().nullable(),
});

export type MaintenanceQuote = z.infer<typeof maintenanceQuoteSchema>;

/**
 * Guardar um orçamento. O DOCUMENTO NÃO ENTRA AQUI: ele viaja como arquivo, no mesmo envio, e
 * quem o valida é o domínio (`refuseQuoteAttachment`).
 */
export const createMaintenanceQuoteSchema = z.object({
  supplier: supplierSchema,
  description: descriptionSchema,
  kind: quoteKindSchema,
  amountCents: amountCentsSchema,
  quotedOn: quotedOnSchema,
  status: quoteStatusSchema.optional(),
  note: noteSchema.optional(),
});

export type CreateMaintenanceQuoteInput = z.input<typeof createMaintenanceQuoteSchema>;

/** Corrigir. Todo campo é opcional: o que não veio fica como estava. */
export const updateMaintenanceQuoteSchema = z.object({
  supplier: supplierSchema.optional(),
  description: descriptionSchema.optional(),
  kind: quoteKindSchema.optional(),
  amountCents: amountCentsSchema.optional(),
  quotedOn: quotedOnSchema.optional(),
  status: quoteStatusSchema.optional(),
  note: noteSchema.optional(),
  /** `true` tira o documento. O documento novo vem como arquivo, não por aqui. */
  removeAttachment: z.coerce.boolean().optional(),
});

export type UpdateMaintenanceQuoteInput = z.input<typeof updateMaintenanceQuoteSchema>;

export const maintenanceQuoteListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  status: quoteStatusSchema.optional(),
  kind: quoteKindSchema.optional(),
});

export type MaintenanceQuoteListQuery = z.infer<typeof maintenanceQuoteListQuerySchema>;

/**
 * A forma do FORMULÁRIO: tudo texto, porque é o que um campo de tela devolve. O valor é
 * digitado em reais ("1.250,00") e só vira centavos na hora de enviar.
 */
export const maintenanceQuoteFormSchema = z.object({
  supplier: supplierSchema,
  description: descriptionSchema,
  kind: quoteKindSchema,
  amount: z
    .string()
    .trim()
    .min(1, AMOUNT_INVALID)
    .refine((value) => parseAmountToCents(value) !== null, AMOUNT_INVALID)
    .refine((value) => (parseAmountToCents(value) ?? 0) <= QUOTE_AMOUNT_MAX_CENTS, AMOUNT_TOO_HIGH),
  quotedOn: quotedOnSchema,
  status: quoteStatusSchema,
  note: z.string().trim().max(QUOTE_NOTE_MAX_LENGTH, NOTE_TOO_LONG),
});

export type MaintenanceQuoteFormValues = z.input<typeof maintenanceQuoteFormSchema>;
