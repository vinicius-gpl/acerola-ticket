import { z } from 'zod';

import { anydeskFormSchema, anydeskSchema } from '../domain/anydesk.util';
import { contactPhoneSchema } from '../domain/phone.util';
import {
  isTicketProblemTypeForArea,
  TICKET_AREAS,
  TICKET_DEPARTMENTS,
  TICKET_PROBLEM_TYPES,
  type TicketProblemType,
} from '../domain/ticket-catalog.util';
import {
  DEFAULT_TICKET_PRIORITY,
  TICKET_PRIORITIES,
  TICKET_STATUS_GROUPS,
  TICKET_STATUSES,
} from '../domain/ticket-status.util';
import { paginationQuerySchema } from './pagination.schema';
import { reportFormatSchema } from './report.schema';
import { ticketAttachmentSchema } from './ticket-attachment.schema';
import { publicTicketHistorySchema } from './ticket-history.schema';

/**
 * O CONTRATO do chamado. Um schema, duas pontas: a API o usa como DTO e Swagger (via
 * `nestjs-zod`) e a web o usa para validar o formulário. É o que garante que a mensagem
 * embaixo do campo seja a mesma que a API devolveria.
 *
 * As mensagens são TEXTO DE TELA — por isso em português (CONTRIBUTING §1).
 */
export const REQUESTER_NAME_MAX_LENGTH = 200;
export const DESCRIPTION_MAX_LENGTH = 5000;
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
export const ticketAreaSchema = z.enum(TICKET_AREAS, chooseFrom('a área do chamado'));
export const ticketProblemTypeSchema = z.enum(
  TICKET_PROBLEM_TYPES as [TicketProblemType, ...TicketProblemType[]],
  chooseFrom('o tipo de problema'),
);

/**
 * O tipo de problema precisa COMBINAR com a área: "ar-condicionado" não existe em Infra, e
 * "rede caiu" não existe em Manutenção. A checagem de enum sozinha não garante isso — ela só
 * sabe que o valor existe em ALGUMA área (é a união das três). Por isso vai num `superRefine`,
 * de quem é dono dos dois campos ao mesmo tempo.
 */
function checkProblemTypeMatchesArea(
  value: { area: string; problemType: string },
  ctx: z.RefinementCtx,
): void {
  if (isTicketProblemTypeForArea(value.area as never, value.problemType)) return;

  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: 'Escolha um tipo de problema da área selecionada',
    path: ['problemType'],
  });
}

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
  /**
   * A ÁREA de quem atende (Infra, Sistema ou Manutenção) — escolhida por quem abre, pelo que
   * PARECE o problema (#13). É dela que depende quem enxerga o chamado: só quem tem cargo
   * nesta área (ou nalguma das `participantAreas`) consegue ler e atender.
   */
  area: ticketAreaSchema,
  department: ticketDepartmentSchema,
  problemType: ticketProblemTypeSchema,
  /**
   * Áreas ADICIONAIS, somadas à área original depois que o chamado já existe — ex.: um
   * chamado de Infra que também precisa de Manutenção. Quem gerencia alguma área do chamado
   * pode somar outra; a área original nunca entra aqui, só as que vieram depois.
   */
  participantAreas: z.array(ticketAreaSchema),
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

  /** O sistema/projeto vinculado ao chamado (quando aplicável, ex: área de Sistema). */
  projectId: z.number().int().nullable().optional(),
  projectName: z.string().nullable().optional(),
  githubIssueNumber: z.number().int().nullable().optional(),
  githubIssueUrl: z.string().nullable().optional(),

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
    area: true,
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
    /**
     * A LINHA DO TEMPO que quem abriu pode ver: só os históricos marcados como visíveis, e
     * sem o bastidor (identidade de quem escreveu, tempo gasto). É por ela que a pessoa
     * acompanha o pedido — "aguardando a peça chegar" responde mais do que uma situação.
     */
    histories: z.array(publicTicketHistorySchema),
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
export const createTicketSchema = z
  .object({
    requesterName: requesterNameSchema,
    area: ticketAreaSchema,
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
  })
  .superRefine(checkProblemTypeMatchesArea);

export type CreateTicketInput = z.input<typeof createTicketSchema>;

/**
 * O MESMO contrato, na forma do FORMULÁRIO: na tela todo campo é texto, e texto vazio é "".
 *
 * As regras e as mensagens são as de cima — por isso o erro embaixo do campo é o mesmo que a
 * API devolveria. O que muda é só a forma: o servidor transforma "" em nulo; o formulário
 * não precisa saber disso.
 */
export const ticketFormSchema = z
  .object({
    requesterName: requesterNameSchema,
    area: ticketAreaSchema,
    department: ticketDepartmentSchema,
    problemType: ticketProblemTypeSchema,
    anydeskId: anydeskFormSchema,
    priority: ticketPrioritySchema,
    contactPhone: contactPhoneSchema,
    notifyWhatsapp: z.boolean(),
    description: descriptionSchema,
  })
  .superRefine(checkProblemTypeMatchesArea);

export type TicketFormValues = z.input<typeof ticketFormSchema>;

/**
 * Os DADOS do chamado que o TI corrige no painel. Campo AUSENTE não mexe; campo NULO limpa.
 *
 * Nada que identifique quem abriu entra aqui: corrigir o nome ou o telefone de um chamado
 * alheio apagaria o que a pessoa de fato escreveu.
 *
 * **O estágio e a solução NÃO entram aqui, de propósito.** Eles só mudam por um HISTÓRICO
 * lançado na ordem de serviço (`createTicketHistorySchema`): é o que garante que toda mudança
 * de estágio tenha quem, quando e por quê na linha do tempo. Aceitar `status` aqui seria uma
 * porta lateral para encerrar um chamado sem deixar rastro.
 *
 * Cada alteração feita por aqui vira, sozinha, um histórico de "Alteração de dados".
 */
export const updateTicketSchema = z.object({
  priority: ticketPrioritySchema.optional(),
  /**
   * Reclassificar a área — quem abriu escolheu pelo que parecia; quem atende descobre que
   * era de outra área. Só quem gerencia (cargo de gestor+) numa das áreas atuais do chamado
   * pode mudar isto (ver `TicketsService.update`).
   */
  area: ticketAreaSchema.optional(),
  /**
   * O tipo do problema É corrigível pelo painel: quem abre escolhe pelo que parece, e quem
   * atende descobre o que era. Sem isso, o mapa de "o que mais dá problema" fica torto para
   * sempre — ele é somado justamente por este campo.
   */
  problemType: ticketProblemTypeSchema.optional(),
  /** A máquina do chamado. Nulo DESVINCULA — é como se corrige um vínculo errado. */
  computerId: z.number().int().positive().nullable().optional(),
  /** O sistema do chamado. Nulo DESVINCULA. */
  projectId: z.number().int().positive().nullable().optional(),
  /* O RESPONSÁVEL não entra aqui: ele não se troca à mão. Quem assume o chamado vira
     responsável ao lançar o primeiro histórico (`toTicketMove`). Um `assignee` no corpo é
     ignorado, como `status` e `solution`. */
});

export type UpdateTicketInput = z.input<typeof updateTicketSchema>;

/**
 * A forma do formulário de DADOS do chamado, no painel.
 *
 * `area` entra aqui porque reclassificar é parte de atender: quem pegou o chamado é quem
 * percebe que ele é de outra área. A API decide se quem está atendendo PODE mudar — o
 * formulário só manda o valor escolhido.
 */
export const ticketDataFormSchema = z
  .object({
    priority: ticketPrioritySchema,
    area: ticketAreaSchema,
    problemType: ticketProblemTypeSchema,
    /**
     * No formulário a máquina é TEXTO, como todo campo de `select`: vazio quer dizer "nenhuma".
     * Quem traduz para número (ou nulo) é o view-model, na hora de enviar.
     */
    computerId: z.string(),
    /** O sistema de software selecionado no select. */
    projectId: z.string().optional(),
  })
  .superRefine(checkProblemTypeMatchesArea);

export type TicketDataFormValues = z.input<typeof ticketDataFormSchema>;

/**
 * Somar uma área PARTICIPANTE a um chamado já aberto (#13) — ex.: um chamado de Infra que
 * também precisa de Manutenção. A área original não entra aqui: ela já está em `area`.
 */
export const addTicketAreaSchema = z.object({
  area: ticketAreaSchema,
});

export type AddTicketAreaInput = z.infer<typeof addTicketAreaSchema>;

export const ticketListQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().optional(),
  /** Os chamados DESTA máquina — é a consulta da ficha do computador. */
  computerId: z.coerce.number().int().positive().optional(),
  /** Os chamados DESTE sistema de software. */
  projectId: z.coerce.number().int().positive().optional(),
  status: ticketStatusSchema.optional(),
  /**
   * Um GRUPO de estágios de uma vez — "aguardando" (os dois) ou "resolvidos" (com e sem
   * ressalva). É o filtro dos cartões do topo, que contam o grupo inteiro.
   */
  statusGroup: z.enum(TICKET_STATUS_GROUPS, chooseFrom('um grupo de estágios')).optional(),
  priority: ticketPrioritySchema.optional(),
  area: ticketAreaSchema.optional(),
  department: ticketDepartmentSchema.optional(),
  problemType: ticketProblemTypeSchema.optional(),
});

export type TicketListQuery = z.infer<typeof ticketListQuerySchema>;

/**
 * Os INDICADORES da fila: os cartões de cima e os dois gráficos.
 *
 * `area` é o CONTEXTO em que a pessoa está (#13), e não um filtro que ela escolhe. Sem ele os
 * números seriam a soma das três áreas enquanto a lista logo abaixo mostra uma só — e o
 * "98 abertos" de Infraestrutura apareceria em Manutenção, onde não existe nenhum.
 *
 * Continua opcional: sem área, os indicadores são de tudo o que a pessoa enxerga (é o que a
 * ficha do computador e qualquer leitura futura sem contexto precisam).
 */
export const ticketDashboardQuerySchema = z.object({
  area: ticketAreaSchema.optional(),
});

export type TicketDashboardQuery = z.infer<typeof ticketDashboardQuerySchema>;

/**
 * Baixar o relatório: os MESMOS filtros da lista, sem página — o arquivo sai com tudo que
 * casou, não só a página aberta na tela.
 */
export const ticketReportQuerySchema = ticketListQuerySchema
  .omit({ page: true, pageSize: true })
  .extend({ format: reportFormatSchema });

export type TicketReportQuery = z.infer<typeof ticketReportQuerySchema>;
