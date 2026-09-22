import { z } from 'zod';

import { TICKET_DEPARTMENTS, TICKET_PROBLEM_TYPES } from '../domain/ticket-catalog.util';
import {
  DEFAULT_TICKET_PRIORITY,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '../domain/ticket-status.util';
import { paginationQuerySchema } from './pagination.schema';

/**
 * O CONTRATO do chamado. Um schema, duas pontas: a API o usa como DTO e Swagger (via
 * `nestjs-zod`) e a web o usa para validar o formulário. É o que garante que a mensagem
 * embaixo do campo seja a mesma que a API devolveria.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const REQUESTER_NAME_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 5000;
export const ANYDESK_MAX_LENGTH = 60;
export const CONTACT_PHONE_MAX_LENGTH = 40;
export const ASSIGNEE_MAX_LENGTH = 200;
export const SOLUTION_MAX_LENGTH = 5000;

/** Menos que isto não é telefone com DDD — é engano de digitação. */
const MIN_PHONE_DIGITS = 10;

export const ticketStatusSchema = z.enum(TICKET_STATUSES);
export const ticketPrioritySchema = z.enum(TICKET_PRIORITIES);
export const ticketDepartmentSchema = z.enum(TICKET_DEPARTMENTS);
export const ticketProblemTypeSchema = z.enum(TICKET_PROBLEM_TYPES);

const requesterNameSchema = z
  .string({ required_error: 'Informe seu nome' })
  .trim()
  .min(1, 'Informe seu nome')
  .max(REQUESTER_NAME_MAX_LENGTH, `O nome pode ter até ${REQUESTER_NAME_MAX_LENGTH} caracteres`);

const descriptionSchema = z
  .string({ required_error: 'Descreva o problema' })
  .trim()
  .min(1, 'Descreva o problema')
  .max(DESCRIPTION_MAX_LENGTH, `A descrição pode ter até ${DESCRIPTION_MAX_LENGTH} caracteres`);

/**
 * O telefone é exigido porque é como o TI retorna quando o chamado precisa de conversa. A
 * contagem ignora parênteses, traço e espaço — senão quem digita bonito seria recusado e
 * quem digita tudo junto passaria.
 */
const contactPhoneSchema = z
  .string({ required_error: 'Informe seu WhatsApp com DDD' })
  .trim()
  .max(CONTACT_PHONE_MAX_LENGTH, 'Esse telefone é longo demais')
  .refine(
    (value) => value.replace(/\D/g, '').length >= MIN_PHONE_DIGITS,
    'Informe o WhatsApp com DDD',
  );

/** Texto opcional: vazio vira nulo, para a busca não tratar "" e nulo como coisas diferentes. */
const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((value) => (value === '' ? null : value))
    .nullable();

const anydeskSchema = optionalText(
  ANYDESK_MAX_LENGTH,
  `O número do AnyDesk pode ter até ${ANYDESK_MAX_LENGTH} caracteres`,
);

const assigneeSchema = optionalText(
  ASSIGNEE_MAX_LENGTH,
  `O nome do responsável pode ter até ${ASSIGNEE_MAX_LENGTH} caracteres`,
);

const solutionSchema = optionalText(
  SOLUTION_MAX_LENGTH,
  `O que foi feito pode ter até ${SOLUTION_MAX_LENGTH} caracteres`,
);

/**
 * O chamado como o PAINEL do TI o enxerga — tudo.
 *
 * `protocol` é derivado do `id` e vem pronto do servidor: se cada tela formatasse por conta
 * própria, o número no aviso sairia diferente do número na tela.
 *
 * `screenshotUrl` é um link ASSINADO e temporário para o print no R2, gerado a cada leitura.
 * Não é endereço fixo de propósito — endereço fixo vazado vira acesso permanente à imagem.
 */
export const ticketSchema = z.object({
  id: z.number().int(),
  protocol: z.string(),
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  requesterName: z.string(),
  department: ticketDepartmentSchema,
  problemType: ticketProblemTypeSchema,
  anydeskId: z.string().nullable(),
  contactPhone: z.string().nullable(),
  notifyWhatsapp: z.boolean(),
  description: z.string(),
  screenshotUrl: z.string().nullable(),
  assignee: z.string().nullable(),
  solution: z.string().nullable(),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  resolvedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
  updatedBy: z.string().nullable(),
});

export type Ticket = z.infer<typeof ticketSchema>;

/**
 * O chamado como QUEM ABRIU o enxerga na consulta por protocolo — de propósito, menos.
 *
 * A consulta é pública: basta o protocolo, e protocolo é sequencial. Por isso o telefone de
 * contato, o responsável e o que foi feito NÃO saem daqui. Quem consulta confere a situação
 * do que pediu; não vira uma porta para ler o cadastro dos outros.
 */
export const publicTicketSchema = ticketSchema.pick({
  id: true,
  protocol: true,
  status: true,
  priority: true,
  requesterName: true,
  department: true,
  problemType: true,
  anydeskId: true,
  description: true,
  screenshotUrl: true,
  createdAt: true,
});

export type PublicTicket = z.infer<typeof publicTicketSchema>;

/**
 * Abrir chamado. É público — quem envia não tem identidade, então tudo que identifica a
 * pessoa vem daqui mesmo (nome, telefone). O que NÃO vem do corpo: a situação (todo chamado
 * nasce aberto), o responsável e a solução — esses são do TI, e aceitá-los aqui deixaria
 * qualquer um abrir um chamado já resolvido por outra pessoa.
 *
 * O print não está no schema: ele viaja como arquivo, na mesma requisição, e é o controller
 * que o recebe. Validar imagem é trabalho de quem lê os bytes, não do Zod.
 */
export const createTicketSchema = z.object({
  requesterName: requesterNameSchema,
  department: ticketDepartmentSchema,
  problemType: ticketProblemTypeSchema,
  anydeskId: anydeskSchema.optional(),
  priority: ticketPrioritySchema.default(DEFAULT_TICKET_PRIORITY),
  contactPhone: contactPhoneSchema,
  /**
   * Vem de uma caixa de seleção, e num formulário multipart todo campo chega como texto:
   * `"true"` e `true` precisam significar a mesma coisa. Qualquer outro valor é "não" —
   * ninguém é inscrito em aviso por engano de digitação.
   */
  notifyWhatsapp: z
    .preprocess((value) => value === true || value === 'true', z.boolean())
    .default(false),
  description: descriptionSchema,
});

export type CreateTicketInput = z.input<typeof createTicketSchema>;

/**
 * O MESMO contrato, na forma do FORMULÁRIO: na tela todo campo é texto, e texto vazio é "".
 *
 * As regras e as mensagens são as de cima — por isso o erro embaixo do campo é o mesmo que a
 * API devolveria. O que muda é só a forma: o servidor transforma "" em nulo; o formulário
 * não precisa saber disso.
 */
export const ticketFormSchema = z.object({
  requesterName: requesterNameSchema,
  department: ticketDepartmentSchema,
  problemType: ticketProblemTypeSchema,
  anydeskId: z
    .string()
    .max(ANYDESK_MAX_LENGTH, `O número do AnyDesk pode ter até ${ANYDESK_MAX_LENGTH} caracteres`),
  priority: ticketPrioritySchema,
  contactPhone: contactPhoneSchema,
  notifyWhatsapp: z.boolean(),
  description: descriptionSchema,
});

export type TicketFormValues = z.input<typeof ticketFormSchema>;

/**
 * O que o TI altera no painel. Campo AUSENTE não mexe; campo NULO limpa.
 *
 * Nada que identifique quem abriu entra aqui: corrigir o nome ou o telefone de um chamado
 * alheio apagaria o que a pessoa de fato escreveu. O TI muda a situação, assume o chamado e
 * registra o que fez — só isso.
 *
 * Não existe exclusão de chamado em lugar nenhum do contrato: o que sai da fila sai por
 * situação (`resolved`, `cancelled`), e o histórico fica.
 */
export const updateTicketSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assignee: assigneeSchema.optional(),
  solution: solutionSchema.optional(),
});

export type UpdateTicketInput = z.input<typeof updateTicketSchema>;

/** A forma do formulário de atendimento, no painel. */
export const ticketAnswerFormSchema = z.object({
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  assignee: z
    .string()
    .max(
      ASSIGNEE_MAX_LENGTH,
      `O nome do responsável pode ter até ${ASSIGNEE_MAX_LENGTH} caracteres`,
    ),
  solution: z
    .string()
    .max(SOLUTION_MAX_LENGTH, `O que foi feito pode ter até ${SOLUTION_MAX_LENGTH} caracteres`),
});

export type TicketAnswerFormValues = z.input<typeof ticketAnswerFormSchema>;

export const ticketListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  department: ticketDepartmentSchema.optional(),
  problemType: ticketProblemTypeSchema.optional(),
});

export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;
