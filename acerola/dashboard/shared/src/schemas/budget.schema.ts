import { z } from 'zod';

import { BUDGET_NEEDS } from '../domain/budget-need.util';
import { departmentSchema } from './computer.schema';

/**
 * O CONTRATO DO ORÇAMENTO: o que falta comprar, depois de descontar o que já está na prateleira.
 *
 * A pergunta que esta tela responde é uma só: "o que eu preciso pedir?". E a resposta honesta
 * não é "12 máquinas precisam de memória" — é "12 precisam, o depósito tem 4, então peça 8".
 * Esse desconto era a parte mais útil do sistema antigo.
 *
 * Nada aqui é tabela. A necessidade é CALCULADA a cada consulta, cruzando inventário e
 * depósito: uma lista de compras guardada continuaria pedindo o pente de memória no dia
 * seguinte ao que alguém o instalou.
 *
 * **Preço não passa por aqui.** A faixa de valores e os links de loja vivem em
 * `domain/price-reference.util`, do lado da tela, com a data em que foram conferidos — preço
 * guardado no banco é um número que envelhece sem ninguém perceber.
 */

/** Quem precisa: a lista sustenta o número, e leva de volta ao inventário. */
export const budgetMachineSchema = z.object({
  computerId: z.number().int(),
  computerName: z.string(),
  computerDisplayName: z.string().nullable(),
  department: departmentSchema.nullable(),
  /** O número que colocou a máquina na lista: GB de memória, % livre, ou nº de manutenções. */
  value: z.number(),
});

export type BudgetMachine = z.infer<typeof budgetMachineSchema>;

export const budgetNeedSchema = z.object({
  key: z.enum(BUDGET_NEEDS),
  /** Quantas máquinas precisam. */
  needed: z.number().int(),
  /** Quantas peças boas o depósito tem hoje, nessa categoria. */
  inStock: z.number().int(),
  /** Quantas comprar: o que falta, nunca negativo. */
  toBuy: z.number().int(),
  machines: z.array(budgetMachineSchema),
});

export type BudgetNeed = z.infer<typeof budgetNeedSchema>;

export const budgetSchema = z.object({
  needs: z.array(budgetNeedSchema),
});

export type Budget = z.infer<typeof budgetSchema>;
