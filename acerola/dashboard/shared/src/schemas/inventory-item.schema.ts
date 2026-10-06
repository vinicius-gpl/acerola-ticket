import { z } from 'zod';

import { INVENTORY_CATEGORIES, INVENTORY_UNITS } from '../domain/inventory-catalog.util';
import { paginationQuerySchema } from './pagination.schema';

/**
 * O CONTRATO do inventário da Manutenção. Um schema, duas pontas: a API o usa como DTO e
 * Swagger, e a tela o usa para validar o formulário.
 *
 * O que mora aqui é o CADASTRO do produto — o que ele é, em que medida se conta e onde fica.
 * Quanto existe de cada um é o Depósito, outra tela: misturar os dois faria editar o nome de
 * um produto parecer uma movimentação de estoque.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const INVENTORY_NAME_MAX_LENGTH = 120;
export const INVENTORY_LOCATION_MAX_LENGTH = 120;
export const INVENTORY_CODE_MAX_LENGTH = 40;
export const INVENTORY_NOTE_MAX_LENGTH = 500;

export const inventoryCategorySchema = z.enum(INVENTORY_CATEGORIES, {
  errorMap: () => ({ message: 'Escolha uma categoria da lista' }),
});

export const inventoryUnitSchema = z.enum(INVENTORY_UNITS, {
  errorMap: () => ({ message: 'Escolha como este produto é contado' }),
});

const nameSchema = z
  .string({ required_error: 'Informe o nome do produto' })
  .trim()
  .min(1, 'Informe o nome do produto')
  .max(INVENTORY_NAME_MAX_LENGTH, `O nome pode ter até ${INVENTORY_NAME_MAX_LENGTH} caracteres`);

/** Texto que a pessoa pode deixar em branco: vazio vira nulo, para o banco não guardar `''`. */
const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((value) => (value === '' ? null : value))
    .nullable();

const locationSchema = optionalText(
  INVENTORY_LOCATION_MAX_LENGTH,
  `O lugar pode ter até ${INVENTORY_LOCATION_MAX_LENGTH} caracteres`,
);

const codeSchema = optionalText(
  INVENTORY_CODE_MAX_LENGTH,
  `O código pode ter até ${INVENTORY_CODE_MAX_LENGTH} caracteres`,
);

const noteSchema = optionalText(
  INVENTORY_NOTE_MAX_LENGTH,
  `A observação pode ter até ${INVENTORY_NOTE_MAX_LENGTH} caracteres`,
);

/**
 * Um produto do inventário, como a tela o recebe.
 *
 * `photoUrl` é um link ASSINADO e temporário para a imagem no R2, gerado a cada leitura — a
 * chave do arquivo nunca sai do servidor, pelo mesmo motivo do print de chamado.
 */
export const inventoryItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  category: inventoryCategorySchema,
  unit: inventoryUnitSchema,
  location: z.string().nullable(),
  /** Patrimônio, etiqueta ou código interno — o que a empresa já usa para achar a coisa. */
  code: z.string().nullable(),
  note: z.string().nullable(),
  photoUrl: z.string().nullable(),
  /**
   * Quanto existe agora, na medida do produto. Só LEITURA: o número muda pelo Depósito, com
   * uma entrada, uma saída ou um descarte — nunca editando o cadastro.
   */
  balance: z.number().int(),

  createdAt: z.string().datetime(),
  createdBy: z.string(),
  updatedAt: z.string().datetime().nullable(),
  updatedBy: z.string().nullable(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;

/**
 * Cadastrar um produto. A FOTO NÃO ENTRA AQUI: ela viaja como arquivo, no mesmo envio, e
 * quem a valida é o domínio (`inventory-photo.util`) — um schema de texto não tem como
 * conferir o conteúdo de uma imagem.
 */
export const createInventoryItemSchema = z.object({
  name: nameSchema,
  category: inventoryCategorySchema,
  unit: inventoryUnitSchema,
  location: locationSchema.optional(),
  code: codeSchema.optional(),
  note: noteSchema.optional(),
});

export type CreateInventoryItemInput = z.input<typeof createInventoryItemSchema>;

/**
 * Corrigir o cadastro. Todo campo é opcional: a tela manda só o que mudou, e o que não veio
 * fica como estava — mandar o objeto inteiro apagaria o que outra pessoa acabou de escrever.
 */
export const updateInventoryItemSchema = z.object({
  name: nameSchema.optional(),
  category: inventoryCategorySchema.optional(),
  unit: inventoryUnitSchema.optional(),
  location: locationSchema.optional(),
  code: codeSchema.optional(),
  note: noteSchema.optional(),
  /** `true` tira a foto do produto. A foto nova vem como arquivo, não por aqui. */
  removePhoto: z.coerce.boolean().optional(),
});

export type UpdateInventoryItemInput = z.input<typeof updateInventoryItemSchema>;

export const inventoryItemListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  category: inventoryCategorySchema.optional(),
});

export type InventoryItemListQuery = z.infer<typeof inventoryItemListQuerySchema>;

/**
 * A forma do FORMULÁRIO: tudo texto, porque é o que um campo de tela devolve, e vazio é `''`
 * e não `null` — o `null` só existe depois que o contrato de escrita transforma.
 */
export const inventoryItemFormSchema = z.object({
  name: nameSchema,
  category: inventoryCategorySchema,
  unit: inventoryUnitSchema,
  location: z
    .string()
    .trim()
    .max(
      INVENTORY_LOCATION_MAX_LENGTH,
      `O lugar pode ter até ${INVENTORY_LOCATION_MAX_LENGTH} caracteres`,
    ),
  code: z
    .string()
    .trim()
    .max(
      INVENTORY_CODE_MAX_LENGTH,
      `O código pode ter até ${INVENTORY_CODE_MAX_LENGTH} caracteres`,
    ),
  note: z
    .string()
    .trim()
    .max(
      INVENTORY_NOTE_MAX_LENGTH,
      `A observação pode ter até ${INVENTORY_NOTE_MAX_LENGTH} caracteres`,
    ),
});

export type InventoryItemFormValues = z.input<typeof inventoryItemFormSchema>;
