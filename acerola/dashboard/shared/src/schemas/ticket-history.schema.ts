import { z } from 'zod';

import {
  MANUAL_TICKET_HISTORY_TYPES,
  TICKET_HISTORY_TYPES,
} from '../domain/ticket-history.util';
import { TICKET_STATUSES } from '../domain/ticket-status.util';
import { ticketAttachmentSchema } from './ticket-attachment.schema';

/**
 * O CONTRATO do histórico de um chamado — a ordem de serviço. Um schema, duas pontas: a API o
 * usa como DTO e Swagger, e a tela o usa para validar o formulário de novo histórico.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const HISTORY_DESCRIPTION_MAX_LENGTH = 5000;

/** Um mês inteiro de trabalho, em minutos: acima disso é erro de digitação, não esforço. */
export const HISTORY_MINUTES_MAX = 60 * 24 * 31;

const chooseFrom = (what: string) => ({ errorMap: () => ({ message: `Escolha ${what}` }) });

export const ticketHistoryTypeSchema = z.enum(
  TICKET_HISTORY_TYPES,
  chooseFrom('o tipo de histórico'),
);

/** Só os tipos que uma pessoa lança: abertura e alteração de dados são do sistema. */
export const manualTicketHistoryTypeSchema = z.enum(
  MANUAL_TICKET_HISTORY_TYPES,
  chooseFrom('o tipo de histórico'),
);

const descriptionSchema = z
  .string({ required_error: 'Descreva o que aconteceu' })
  .trim()
  .min(1, 'Descreva o que aconteceu')
  .max(
    HISTORY_DESCRIPTION_MAX_LENGTH,
    `O histórico pode ter até ${HISTORY_DESCRIPTION_MAX_LENGTH} caracteres`,
  );

/**
 * Um histórico, como o PAINEL o enxerga.
 *
 * `statusAfter` é o estágio em que o chamado ficou DEPOIS deste histórico, gravado junto com
 * ele: é o que deixa a linha do tempo e o relatório dizerem "passou a aguardar peça em tal
 * dia" sem recalcular a história inteira — e continua certo mesmo se a regra de estágio mudar.
 *
 * `authorName` é o nome de quem escreveu, guardado como texto: na abertura é o nome que a
 * pessoa digitou no formulário público (ela não tem conta), e nos demais é o nome de quem
 * estava logado. `createdBy` é a identidade (e-mail) quando há uma — vem sempre da sessão,
 * nunca do corpo.
 */
export const ticketHistorySchema = z.object({
  id: z.number().int(),
  ticketId: z.number().int(),
  type: ticketHistoryTypeSchema,
  description: z.string(),
  statusAfter: z.enum(TICKET_STATUSES),
  /** Quem abriu o chamado enxerga este histórico na consulta pública? */
  isVisibleToRequester: z.boolean(),
  /** Tempo gasto neste passo, em minutos. Nulo quando ninguém informou. */
  minutesSpent: z.number().int().nullable(),
  authorName: z.string(),
  createdBy: z.string().nullable(),
  createdAt: z.string().datetime(),
  /** Os arquivos anexados JUNTO com este histórico. */
  attachments: z.array(ticketAttachmentSchema),
});

export type TicketHistory = z.infer<typeof ticketHistorySchema>;

/**
 * O histórico como QUEM ABRIU o enxerga na consulta por protocolo — de propósito, menos.
 *
 * Só saem os históricos marcados como visíveis, e sem a identidade de quem escreveu nem o
 * tempo gasto: quem consulta acompanha o andamento do que pediu, não o bastidor do TI.
 */
export const publicTicketHistorySchema = ticketHistorySchema.pick({
  id: true,
  type: true,
  description: true,
  statusAfter: true,
  authorName: true,
  createdAt: true,
  attachments: true,
});

export type PublicTicketHistory = z.infer<typeof publicTicketHistorySchema>;

/**
 * Lançar um histórico. Quem escreve e quando NÃO vêm do corpo: a autoria vem da identidade e a
 * data é a do servidor. O estágio resultante também não — ele é consequência do tipo.
 *
 * Os arquivos não estão no schema: viajam na mesma requisição, e é o controller que os recebe.
 */
export const createTicketHistorySchema = z.object({
  type: manualTicketHistoryTypeSchema,
  description: descriptionSchema,
  /**
   * Num formulário multipart todo campo chega como texto: `"true"` e `true` significam a
   * mesma coisa. Ausente é VISÍVEL — o padrão é a pessoa acompanhar o que acontece com o
   * pedido dela; esconder é a exceção, e tem de ser escolhida.
   */
  isVisibleToRequester: z
    .preprocess((value) => (value === undefined ? true : value === true || value === 'true'), z.boolean())
    .default(true),
  minutesSpent: z
    .preprocess(
      (value) => (value === '' || value === undefined || value === null ? null : Number(value)),
      z
        .number({ invalid_type_error: 'Informe o tempo em minutos' })
        .int('Informe o tempo em minutos inteiros')
        .min(0, 'O tempo não pode ser negativo')
        .max(HISTORY_MINUTES_MAX, 'Esse tempo é maior do que um mês inteiro')
        .nullable(),
    )
    .optional(),
});

export type CreateTicketHistoryInput = z.input<typeof createTicketHistorySchema>;

/**
 * O MESMO contrato, na forma do FORMULÁRIO: na tela todo campo é texto, e texto vazio é "".
 * As regras e as mensagens são as de cima — o erro embaixo do campo é o que a API devolveria.
 */
export const ticketHistoryFormSchema = z.object({
  type: manualTicketHistoryTypeSchema,
  description: descriptionSchema,
  isVisibleToRequester: z.boolean(),
  minutesSpent: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\d+$/.test(value), 'Informe o tempo em minutos inteiros')
    .refine(
      (value) => value === '' || Number(value) <= HISTORY_MINUTES_MAX,
      'Esse tempo é maior do que um mês inteiro',
    ),
});

export type TicketHistoryFormValues = z.input<typeof ticketHistoryFormSchema>;
