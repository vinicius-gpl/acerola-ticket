import { z } from 'zod';

import { TASK_STATUSES } from '../domain/task-status.util';
import { paginationQuerySchema } from './pagination.schema';

/**
 * O CONTRATO da feature de exemplo. Um schema, duas pontas: a API o usa como DTO e Swagger
 * (via `nestjs-zod`) e a web o usa para validar o formulário. É o que garante que a mensagem
 * embaixo do campo seja a mesma que a API devolveria.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const TITLE_MAX_LENGTH = 120;
export const DESCRIPTION_MAX_LENGTH = 2000;

export const taskStatusSchema = z.enum(TASK_STATUSES);

export const taskSchema = z.object({
  id: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  status: taskStatusSchema,
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  updatedAt: z.string().datetime().nullable(),
  updatedBy: z.string().nullable(),
});

export type Task = z.infer<typeof taskSchema>;

/**
 * Título com espaço sobrando é aparado ANTES de medir. Sem isso, "   " passaria como título
 * preenchido e a lista ganharia uma linha em branco que ninguém consegue identificar.
 */
const titleSchema = z
  .string({ required_error: 'Informe o título' })
  .trim()
  .min(1, 'Informe o título')
  .max(TITLE_MAX_LENGTH, `O título pode ter até ${TITLE_MAX_LENGTH} caracteres`);

/** Descrição vazia vira nulo: "" e nulo significando a mesma coisa é como a busca discorda de si. */
const descriptionSchema = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX_LENGTH, `A descrição pode ter até ${DESCRIPTION_MAX_LENGTH} caracteres`)
  .transform((value) => (value === '' ? null : value))
  .nullable();

/**
 * Autoria (`createdBy`, `updatedBy`) NÃO está aqui, e não é esquecimento: ela é carimbada no
 * servidor, com quem veio da identidade. Aceitar autoria do corpo é aceitar que alguém
 * assine por outra pessoa.
 */
export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  status: taskStatusSchema.default('todo'),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;

/**
 * O MESMO contrato, na forma do FORMULÁRIO: na tela todo campo é texto, e texto vazio é "".
 *
 * As regras e as mensagens são as de cima (`titleSchema`, o limite da descrição) — por isso o
 * erro embaixo do campo é o mesmo que a API devolveria. O que muda é só a forma: o servidor
 * transforma "" em nulo; o formulário não precisa saber disso.
 */
export const taskFormSchema = z.object({
  title: titleSchema,
  description: z
    .string()
    .max(DESCRIPTION_MAX_LENGTH, `A descrição pode ter até ${DESCRIPTION_MAX_LENGTH} caracteres`),
  status: taskStatusSchema,
});

export type TaskFormValues = z.input<typeof taskFormSchema>;

/**
 * Edição parcial: campo AUSENTE não mexe; campo NULO limpa. Tratar os dois como iguais
 * tornaria impossível apagar uma descrição.
 */
export const updateTaskSchema = z.object({
  title: titleSchema.optional(),
  description: descriptionSchema.optional(),
  status: taskStatusSchema.optional(),
});

export type UpdateTaskInput = z.input<typeof updateTaskSchema>;

export const taskListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  status: taskStatusSchema.optional(),
});

export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
