import { z } from 'zod';

import { PART_CATEGORIES } from '../domain/part-catalog.util';
import { PERIPHERAL_DESTINIES } from '../domain/transfer.util';
import { departmentSchema } from './computer.schema';

/**
 * O CONTRATO DA TRANSFERÊNCIA: para onde a máquina foi, quem levou e o que ficou para trás.
 *
 * O mesmo schema valida a API e o formulário (CONTRIBUTING §9).
 *
 * `toDepartment` é ANULÁVEL porque "sem departamento" é um destino de verdade: é assim que o
 * sistema marca a máquina que voltou para a prateleira, e é dali que a Inteligência tira a
 * lista de reservas.
 */

/** Uma peça que está instalada na máquina hoje — o que o formulário precisa decidir. */
export const installedPartSchema = z.object({
  partId: z.number().int(),
  name: z.string(),
  category: z.enum(PART_CATEGORIES),
  /** Quantas unidades desta peça saíram do depósito para esta máquina e não voltaram. */
  quantity: z.number().int(),
});

export type InstalledPart = z.infer<typeof installedPartSchema>;

/**
 * O destino de cada periférico na hora da mudança.
 *
 * Teclado, mouse e monitor costumam ser da ESTAÇÃO, não da máquina: quem troca de computador
 * quase sempre deixa esses três na mesa. Registrar isso é o que impede o depósito de dizer
 * que o mouse foi embora com a máquina quando ele está na mesa do lado.
 */
export const transferPeripheralSchema = z
  .object({
    partId: z.number().int(),
    quantity: z.number().int().positive(),
    destiny: z.enum(PERIPHERAL_DESTINIES),
    /** Qual máquina assume a peça que fica. Só faz sentido para quem fica. */
    destinationComputerId: z.number().int().nullable().optional(),
  })
  .superRefine((peripheral, ctx) => {
    if (peripheral.destiny !== 'station' || peripheral.destinationComputerId) return;

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['destinationComputerId'],
      message: 'Diga qual máquina assume esta peça.',
    });
  });

export type TransferPeripheralInput = z.infer<typeof transferPeripheralSchema>;

export const createTransferSchema = z.object({
  /* Nulo é "sem departamento": a máquina volta para a prateleira. */
  toDepartment: departmentSchema.nullable(),
  /* Quem levou a máquina. Texto livre: pode ser alguém sem login no sistema. */
  responsible: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  peripherals: z.array(transferPeripheralSchema).default([]),
});

export type CreateTransferInput = z.input<typeof createTransferSchema>;

/**
 * Uma linha do histórico.
 *
 * `fromDepartment` fica GUARDADO, e não é lido da máquina na hora de mostrar: o departamento
 * de origem é um fato do dia da mudança, e a máquina já andou para outro lugar desde então.
 */
export const transferSchema = z.object({
  id: z.number().int(),
  computerId: z.number().int(),
  fromDepartment: departmentSchema.nullable(),
  toDepartment: departmentSchema.nullable(),
  responsible: z.string().nullable(),
  note: z.string().nullable(),
  /** Quantos periféricos ficaram para trás nesta mudança. */
  peripheralsLeftBehind: z.number().int(),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
});

export type Transfer = z.infer<typeof transferSchema>;
