import { z } from 'zod';

import { MAINTENANCE_TYPES, PREVENTIVE_STATUSES } from '../domain/maintenance.util';
import { departmentSchema } from './computer.schema';
import { paginationQuerySchema } from './pagination.schema';

/**
 * O CONTRATO da manutenção. Um schema, duas pontas: a API o usa como DTO e Swagger e a web o
 * usa para validar o formulário.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const DESCRIPTION_MAX_LENGTH = 1000;
export const PERFORMED_BY_MAX_LENGTH = 200;
export const OTHER_MACHINE_MAX_LENGTH = 200;

export const maintenanceTypeSchema = z.enum(MAINTENANCE_TYPES, {
  errorMap: () => ({ message: 'Escolha um tipo de manutenção da lista' }),
});

const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((value) => (value === '' ? null : value))
    .nullable();

const descriptionSchema = optionalText(
  DESCRIPTION_MAX_LENGTH,
  `O que foi feito pode ter até ${DESCRIPTION_MAX_LENGTH} caracteres`,
);

const performedBySchema = optionalText(
  PERFORMED_BY_MAX_LENGTH,
  `O nome de quem fez pode ter até ${PERFORMED_BY_MAX_LENGTH} caracteres`,
);

const otherMachineSchema = optionalText(
  OTHER_MACHINE_MAX_LENGTH,
  `O nome do equipamento pode ter até ${OTHER_MACHINE_MAX_LENGTH} caracteres`,
);

/**
 * Uma manutenção como a tela a recebe.
 *
 * O nome e o departamento da máquina vêm do INVENTÁRIO a cada consulta, e não de uma cópia
 * guardada aqui. É o que faz uma máquina renomeada aparecer com o nome novo em todo o
 * histórico dela — com cópia, o passado passaria a falar de um equipamento que ninguém mais
 * reconhece.
 */
export const maintenanceSchema = z.object({
  id: z.number().int(),

  /** A máquina do inventário. Nulo quando é equipamento de fora, digitado à mão. */
  computerId: z.number().int().nullable(),
  computerName: z.string().nullable(),
  computerDisplayName: z.string().nullable(),
  computerDepartment: departmentSchema.nullable(),
  /** O equipamento que não está no inventário — um notebook antigo, uma impressora. */
  otherMachine: z.string().nullable(),

  type: maintenanceTypeSchema,
  description: z.string().nullable(),
  /** Quem fez o serviço. Texto livre: pode ser alguém de fora da empresa. */
  performedBy: z.string().nullable(),
  performedAt: z.string().datetime(),

  createdAt: z.string().datetime(),
  createdBy: z.string(),
  updatedAt: z.string().datetime().nullable(),
  updatedBy: z.string().nullable(),
});

export type Maintenance = z.infer<typeof maintenanceSchema>;

/**
 * Uma manutenção precisa dizer EM QUE equipamento ela foi feita.
 *
 * Ou uma máquina do inventário, ou o nome de um equipamento de fora. Sem isso o registro não
 * serve para nada: um histórico que não diz de quem é não responde "esta máquina dá trabalho
 * demais?", que é a pergunta que ele existe para responder.
 */
function requireMachine<T extends { computerId?: number | null; otherMachine?: string | null }>(
  schema: z.ZodType<T>,
) {
  return schema.superRefine((value, context) => {
    if (value.computerId || value.otherMachine) return;

    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['computerId'],
      message: 'Escolha a máquina ou informe o nome do equipamento',
    });
  });
}

const maintenanceInputShape = {
  computerId: z.number().int().nullable().optional(),
  otherMachine: otherMachineSchema.optional(),
  type: maintenanceTypeSchema,
  description: descriptionSchema.optional(),
  performedBy: performedBySchema.optional(),
  /** Quando o serviço foi feito — não é a data em que alguém digitou. */
  performedAt: z.string().datetime({ message: 'Informe uma data válida' }),
};

export const createMaintenanceSchema = requireMachine(z.object(maintenanceInputShape));

export type CreateMaintenanceInput = z.input<typeof createMaintenanceSchema>;

export const updateMaintenanceSchema = z.object({
  ...maintenanceInputShape,
  type: maintenanceTypeSchema.optional(),
  performedAt: z.string().datetime({ message: 'Informe uma data válida' }).optional(),
});

export type UpdateMaintenanceInput = z.input<typeof updateMaintenanceSchema>;

/**
 * A forma do FORMULÁRIO: tudo texto, porque é o que um campo de tela devolve.
 *
 * `computerId` vem como string do `select` ("" = equipamento de fora) e `performedAt` como
 * `AAAA-MM-DD`, que é o que o campo de data do navegador entrega.
 */
export const maintenanceFormSchema = z
  .object({
    computerId: z.string(),
    otherMachine: z
      .string()
      .max(OTHER_MACHINE_MAX_LENGTH, `Até ${OTHER_MACHINE_MAX_LENGTH} caracteres`),
    type: maintenanceTypeSchema,
    description: z.string().max(DESCRIPTION_MAX_LENGTH, `Até ${DESCRIPTION_MAX_LENGTH} caracteres`),
    performedBy: z
      .string()
      .max(PERFORMED_BY_MAX_LENGTH, `Até ${PERFORMED_BY_MAX_LENGTH} caracteres`),
    performedAt: z.string().min(1, 'Informe a data'),
  })
  .superRefine((value, context) => {
    if (value.computerId !== '' || value.otherMachine.trim() !== '') return;

    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['otherMachine'],
      message: 'Escolha a máquina na lista ou escreva o nome do equipamento',
    });
  });

export type MaintenanceFormValues = z.input<typeof maintenanceFormSchema>;

export const maintenanceListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  computerId: z.coerce.number().int().optional(),
  type: maintenanceTypeSchema.optional(),
});

export type MaintenanceListQuery = z.infer<typeof maintenanceListQuerySchema>;

/**
 * Uma linha do quadro de preventivas: uma máquina do inventário e quando ela foi aberta pela
 * última vez.
 *
 * Isto não é uma tabela do banco — é o cruzamento do inventário com o histórico, refeito a
 * cada consulta. Guardar "está vencida" como campo daria uma máquina presa em vencida para
 * sempre, porque ninguém fica vivo para reescrever o campo quando o prazo vira.
 */
export const preventiveDueSchema = z.object({
  computerId: z.number().int(),
  computerName: z.string(),
  computerDisplayName: z.string().nullable(),
  computerDepartment: departmentSchema.nullable(),
  lastDoneAt: z.string().datetime().nullable(),
  status: z.enum(PREVENTIVE_STATUSES),
  /** Quantas manutenções esta máquina já teve — três ou mais já é candidata a troca. */
  maintenanceCount: z.number().int(),
});

export type PreventiveDue = z.infer<typeof preventiveDueSchema>;
