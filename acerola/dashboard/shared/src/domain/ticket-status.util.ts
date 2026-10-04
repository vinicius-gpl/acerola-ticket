/**
 * O vocabulário de situação de um chamado.
 *
 * A lista mora no domínio porque três camadas dependem dela ao mesmo tempo: o schema Zod
 * valida por ela, a coluna do Postgres restringe por ela e o selo da tela escolhe a cor por
 * ela. Três listas escritas à mão divergem na primeira vez que alguém acrescenta um valor.
 *
 * **Chamado não se exclui.** Não há remoção no sistema: o que muda é a situação. Um chamado
 * aberto por engano vira `cancelled`, não desaparece — apagar destruiria o histórico que
 * alimenta os indicadores e a memória de quem já pediu o quê.
 *
 * **A situação é o ESTÁGIO da ordem de serviço, e ninguém a edita à mão.** Ela é consequência
 * do último histórico lançado (ver `ticket-history.util.ts`): quem registra "aguardando peça"
 * põe o chamado nesse estágio; quem registra a solução o encerra. Um campo de situação editável
 * à parte permitiria um chamado "resolvido" sem ninguém ter escrito o que foi feito.
 *
 * Os dois estágios de espera existem porque "em atendimento" misturava duas coisas opostas: o
 * que está na mão do TI e o que está parado esperando alguém. E "encerrado com ressalva" é o
 * fim que não é uma solução inteira — funciona, mas ficou algo por fazer, e a ressalva diz o quê.
 */
export const TICKET_STATUSES = [
  'open',
  'in_progress',
  'waiting_requester',
  'waiting_third_party',
  'resolved',
  'resolved_with_caveats',
  'cancelled',
] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** O texto de tela. A chave é inglês (o usuário não vê); o rótulo é português (vê). */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  waiting_requester: 'Aguardando solicitante',
  waiting_third_party: 'Aguardando terceiro',
  resolved: 'Resolvido',
  resolved_with_caveats: 'Encerrado com ressalva',
  cancelled: 'Cancelado',
};

export type TicketStatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

/**
 * O tom vem do domínio, não da tela. Deixar cada tela escolher a cor é como a mesma situação
 * aparece verde numa lista e cinza em outra.
 */
const STATUS_TONES: Record<TicketStatus, TicketStatusTone> = {
  open: 'danger',
  in_progress: 'info',
  waiting_requester: 'warning',
  waiting_third_party: 'warning',
  resolved: 'success',
  resolved_with_caveats: 'warning',
  cancelled: 'neutral',
};

export function ticketStatusTone(status: TicketStatus): TicketStatusTone {
  return STATUS_TONES[status];
}

export function ticketStatusLabel(status: TicketStatus): string {
  return TICKET_STATUS_LABELS[status];
}

export function isTicketStatus(value: unknown): value is TicketStatus {
  return typeof value === 'string' && (TICKET_STATUSES as readonly string[]).includes(value);
}

/**
 * Situações que encerram o chamado — ele sai da fila de trabalho do TI.
 *
 * Existe como lista, e não como `status === 'resolved'` espalhado, porque "encerrado" é uma
 * pergunta que a fila, o indicador de tempo médio e o contador do painel fazem separadamente.
 */
export const CLOSED_TICKET_STATUSES: readonly TicketStatus[] = [
  'resolved',
  'resolved_with_caveats',
  'cancelled',
];

export function isClosedTicketStatus(status: TicketStatus): boolean {
  return CLOSED_TICKET_STATUSES.includes(status);
}

/**
 * Estágios em que o chamado está PARADO esperando alguém de fora do TI. O tempo neles não é
 * tempo de atendimento — e é por eles que se cobra a resposta de quem abriu ou do fornecedor.
 */
export const WAITING_TICKET_STATUSES: readonly TicketStatus[] = [
  'waiting_requester',
  'waiting_third_party',
];

export function isWaitingTicketStatus(status: TicketStatus): boolean {
  return WAITING_TICKET_STATUSES.includes(status);
}

/**
 * Encerrado COM SUCESSO: o problema foi tratado, com ou sem ressalva. É o que o indicador de
 * "resolvidos" e o tempo médio de resolução contam — cancelado encerra, mas não resolve.
 */
export const SOLVED_TICKET_STATUSES: readonly TicketStatus[] = ['resolved', 'resolved_with_caveats'];

export function isSolvedTicketStatus(status: TicketStatus): boolean {
  return SOLVED_TICKET_STATUSES.includes(status);
}

/** Urgência informada por quem abre o chamado. */
export const TICKET_PRIORITIES = ['low', 'medium', 'high'] as const;

export type TicketPriority = (typeof TICKET_PRIORITIES)[number];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
};

export function ticketPriorityLabel(priority: TicketPriority): string {
  return TICKET_PRIORITY_LABELS[priority];
}

export type TicketPriorityTone = 'neutral' | 'warning' | 'danger';

const PRIORITY_TONES: Record<TicketPriority, TicketPriorityTone> = {
  low: 'neutral',
  medium: 'warning',
  high: 'danger',
};

export function ticketPriorityTone(priority: TicketPriority): TicketPriorityTone {
  return PRIORITY_TONES[priority];
}

/**
 * Quem abre o chamado não escolhe a situação: todo chamado nasce aberto. Deixar a situação
 * vir do formulário público permitiria alguém abrir um chamado já "resolvido".
 */
export const INITIAL_TICKET_STATUS: TicketStatus = 'open';

export const DEFAULT_TICKET_PRIORITY: TicketPriority = 'medium';
