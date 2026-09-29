import { z } from 'zod';

import { anydeskFormSchema, anydeskSchema } from '../domain/anydesk.util';
import { contactPhoneSchema } from '../domain/phone.util';
import { TICKET_DEPARTMENTS, TICKET_PROBLEM_TYPES } from '../domain/ticket-catalog.util';
import {
  DEFAULT_TICKET_PRIORITY,
  TICKET_PRIORITIES,
  TICKET_STATUSES,
} from '../domain/ticket-status.util';
import { paginationQuerySchema } from './pagination.schema';
import { reportFormatSchema } from './report.schema';
import { ticketAttachmentSchema } from './ticket-attachment.schema';

/**
 * O CONTRATO do chamado. Um schema, duas pontas: a API o usa como DTO e Swagger (via
 * `nestjs-zod`) e a web o usa para validar o formulário. É o que garante que a mensagem
 * embaixo do campo seja a mesma que a API devolveria.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const REQUESTER_NAME_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 5000;
export const ASSIGNEE_MAX_LENGTH = 200;
export const SOLUTION_MAX_LENGTH = 5000;

export { CONTACT_PHONE_MAX_LENGTH } from '../domain/phone.util';
export { ANYDESK_MIN_DIGITS, ANYDESK_MAX_DIGITS } from '../domain/anydesk.util';

/**
 * A mensagem de lista fechada, em português.
 *
 * O Zod recusa um valor fora da lista com um texto em inglês que enumera as opções internas
 * ("Invalid enum value. Expected 'analyze' | ..."). Esse texto chega ao rodapé do campo, e a
 * régua do projeto é clara: o usuário vê, é português (CONTRIBUTING §1). Aqui ele é trocado
 * por uma frase que diz o que fazer — as opções a pessoa já está vendo no próprio `select`.
 */
const chooseFrom = (what: string) => ({ errorMap: () => ({ message: `Escolha ${what}` }) });

export const ticketStatusSchema = z.enum(TICKET_STATUSES, chooseFrom('uma situação da lista'));
export const ticketPrioritySchema = z.enum(TICKET_PRIORITIES, chooseFrom('a urgência'));
export const ticketDepartmentSchema = z.enum(TICKET_DEPARTMENTS, chooseFrom('seu departamento'));
export const ticketProblemTypeSchema = z.enum(
  TICKET_PROBLEM_TYPES,
  chooseFrom('o tipo de problema'),
);

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

/** Texto opcional: vazio vira nulo, para a busca não tratar "" e nulo como coisas diferentes. */
const optionalText = (max: number, tooLong: string) =>
  z
    .string()
    .trim()
    .max(max, tooLong)
    .transform((value) => (value === '' ? null : value))
    .nullable();

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

  /**
   * A MÁQUINA em que o problema aconteceu — quem preenche é o TI, atendendo.
   *
   * Nulo é o normal no começo: todo chamado nasce sem máquina, porque quem abre descreve o
   * problema e não sabe (nem precisa saber) qual computador o sistema conhece por qual nome.
   * O nome vem junto para a lista não precisar de uma segunda consulta só para mostrá-lo.
   */
  computerId: z.number().int().nullable(),
  computerName: z.string().nullable(),

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
export const publicTicketSchema = ticketSchema
  .pick({
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
  })
  .extend({
    /**
     * Os arquivos que ACOMPANHARAM o chamado.
     *
     * Saem na consulta pública porque são de quem abriu: ela precisa conferir que a nota
     * fiscal chegou, e rever o vídeo que mandou. Mexer neles é outra história — excluir só
     * pelo painel, com identidade (ver o controller de anexos).
     */
    attachments: z.array(ticketAttachmentSchema),
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
  anydeskId: anydeskFormSchema,
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
  /**
   * O tipo do problema É corrigível pelo painel: quem abre escolhe pelo que parece, e quem
   * atende descobre o que era. Sem isso, o mapa de "o que mais dá problema" fica torto para
   * sempre — ele é somado justamente por este campo.
   */
  problemType: ticketProblemTypeSchema.optional(),
  /** A máquina do chamado. Nulo DESVINCULA — é como se corrige um vínculo errado. */
  computerId: z.number().int().positive().nullable().optional(),
  assignee: assigneeSchema.optional(),
  solution: solutionSchema.optional(),
});

export type UpdateTicketInput = z.input<typeof updateTicketSchema>;

/** A forma do formulário de atendimento, no painel. */
export const ticketAnswerFormSchema = z.object({
  status: ticketStatusSchema,
  priority: ticketPrioritySchema,
  problemType: ticketProblemTypeSchema,
  /**
   * No formulário a máquina é TEXTO, como todo campo de `select`: vazio quer dizer "nenhuma".
   * Quem traduz para número (ou nulo) é o view-model, na hora de enviar.
   */
  computerId: z.string(),
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
  /** Os chamados DESTA máquina — é a consulta da ficha do computador. */
  computerId: z.coerce.number().int().positive().optional(),
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  department: ticketDepartmentSchema.optional(),
  problemType: ticketProblemTypeSchema.optional(),
});

export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

/**
 * Baixar o relatório: os MESMOS filtros da lista, sem página — o arquivo sai com tudo que
 * casou, não só a página aberta na tela.
 */
export const ticketReportQuerySchema = ticketListQuerySchema
  .omit({ page: true, pageSize: true })
  .extend({ format: reportFormatSchema });

export type TicketReportQuery = z.infer<typeof ticketReportQuerySchema>;
