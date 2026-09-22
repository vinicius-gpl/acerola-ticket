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
 */
export const TICKET_STATUSES = ['open', 'in_progress', 'resolved', 'cancelled'] as const;

export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** O texto de tela. A chave é inglês (o usuário não vê); o rótulo é português (vê). */
export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  resolved: 'Resolvido',
  cancelled: 'Cancelado',
};

export type TicketStatusTone = 'neutral' | 'info' | 'success' | 'danger';

/**
 * O tom vem do domínio, não da tela. Deixar cada tela escolher a cor é como a mesma situação
 * aparece verde numa lista e cinza em outra.
 */
const STATUS_TONES: Record<TicketStatus, TicketStatusTone> = {
  open: 'danger',
  in_progress: 'info',
  resolved: 'success',
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
export const CLOSED_TICKET_STATUSES: readonly TicketStatus[] = ['resolved', 'cancelled'];

export function isClosedTicketStatus(status: TicketStatus): boolean {
  return CLOSED_TICKET_STATUSES.includes(status);
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
