import { isClosedTicketStatus, isWaitingTicketStatus, type TicketStatus } from './ticket-status.util';

/**
 * OS HISTÓRICOS de um chamado — o chamado tratado como ORDEM DE SERVIÇO.
 *
 * Antes, atender era sobrescrever: a situação, o responsável e a solução eram campos do
 * chamado, e cada salvamento apagava o anterior. Não sobrava o que foi feito na terça nem quem
 * pediu a peça na quinta — só o estado final.
 *
 * Agora cada coisa que acontece é um HISTÓRICO lançado na ordem de serviço: quem, quando, o quê
 * e de que tipo. O chamado guarda o estágio em que está, mas é o histórico que o leva até lá —
 * a linha do tempo é a verdade, e o estágio é só a leitura do último passo.
 *
 * O TIPO decide três coisas, e as três moram aqui porque a API, o formulário e o relatório
 * precisam concordar: para qual estágio o chamado vai, se o histórico o encerra, e em que
 * estágio ele pode ser lançado.
 */
export const TICKET_HISTORY_TYPES = [
  'opening',
  'note',
  'start',
  'waiting_requester',
  'waiting_third_party',
  'resume',
  'update',
  'resolution',
  'closure_with_caveats',
  'cancellation',
  'reopening',
] as const;

export type TicketHistoryType = (typeof TICKET_HISTORY_TYPES)[number];

/** O texto de tela. A chave é inglês (o usuário não vê); o rótulo é português (vê). */
export const TICKET_HISTORY_TYPE_LABELS: Record<TicketHistoryType, string> = {
  opening: 'Abertura',
  note: 'Andamento',
  start: 'Início do atendimento',
  waiting_requester: 'Aguardando solicitante',
  waiting_third_party: 'Aguardando terceiro ou peça',
  resume: 'Retomada',
  update: 'Alteração de dados',
  resolution: 'Solução',
  closure_with_caveats: 'Encerramento com ressalva',
  cancellation: 'Cancelamento',
  reopening: 'Reabertura',
};

export function ticketHistoryTypeLabel(type: TicketHistoryType): string {
  return TICKET_HISTORY_TYPE_LABELS[type];
}

export type TicketHistoryTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

/** O tom vem do domínio: a mesma cor na linha do tempo, no seletor e no relatório. */
const HISTORY_TONES: Record<TicketHistoryType, TicketHistoryTone> = {
  opening: 'brand',
  note: 'neutral',
  start: 'info',
  waiting_requester: 'warning',
  waiting_third_party: 'warning',
  resume: 'info',
  update: 'neutral',
  resolution: 'success',
  closure_with_caveats: 'warning',
  cancellation: 'danger',
  reopening: 'info',
};

export function ticketHistoryTone(type: TicketHistoryType): TicketHistoryTone {
  return HISTORY_TONES[type];
}

/**
 * Tipos que SÓ O SISTEMA lança: a abertura (nasce junto com o chamado) e a alteração de dados
 * (registrada quando alguém muda a urgência, a área, o tipo ou a máquina). Aceitá-los do
 * formulário deixaria alguém "abrir" um chamado pela segunda vez ou forjar uma alteração.
 */
export const SYSTEM_TICKET_HISTORY_TYPES: readonly TicketHistoryType[] = ['opening', 'update'];

export function isSystemTicketHistoryType(type: TicketHistoryType): boolean {
  return SYSTEM_TICKET_HISTORY_TYPES.includes(type);
}

/** Os tipos que uma pessoa escolhe ao lançar um histórico, na ordem em que o seletor mostra. */
export const MANUAL_TICKET_HISTORY_TYPES = [
  'start',
  'note',
  'waiting_requester',
  'waiting_third_party',
  'resume',
  'resolution',
  'closure_with_caveats',
  'cancellation',
  'reopening',
] as const satisfies readonly TicketHistoryType[];

export type ManualTicketHistoryType = (typeof MANUAL_TICKET_HISTORY_TYPES)[number];

/**
 * Para qual estágio cada tipo leva o chamado. Tipo ausente NÃO muda o estágio: um andamento
 * ou uma alteração de dados só acrescentam à linha do tempo.
 */
const RESULTING_STATUS: Partial<Record<TicketHistoryType, TicketStatus>> = {
  opening: 'open',
  start: 'in_progress',
  waiting_requester: 'waiting_requester',
  waiting_third_party: 'waiting_third_party',
  resume: 'in_progress',
  resolution: 'resolved',
  closure_with_caveats: 'resolved_with_caveats',
  cancellation: 'cancelled',
  reopening: 'in_progress',
};

/** O estágio do chamado DEPOIS deste histórico. */
export function nextTicketStatus(current: TicketStatus, type: TicketHistoryType): TicketStatus {
  return RESULTING_STATUS[type] ?? current;
}

/** Históricos que ENCERRAM o chamado — ele sai da fila de trabalho. */
export const CLOSING_TICKET_HISTORY_TYPES: readonly TicketHistoryType[] = [
  'resolution',
  'closure_with_caveats',
  'cancellation',
];

export function isClosingTicketHistoryType(type: TicketHistoryType): boolean {
  return CLOSING_TICKET_HISTORY_TYPES.includes(type);
}

/**
 * Pode lançar este tipo de histórico num chamado que está neste estágio?
 *
 * Devolve o MOTIVO da recusa, em português (é texto de tela), ou `null` quando pode. A API
 * recusa com esta mesma frase e o formulário esconde a opção por esta mesma regra — por isso
 * mora no domínio, e não num `if` em cada ponta.
 */
export function refuseTicketHistory(
  status: TicketStatus,
  type: TicketHistoryType,
): string | null {
  if (isSystemTicketHistoryType(type)) {
    return 'Este tipo de histórico é registrado pelo próprio sistema.';
  }

  /* Encerrado é encerrado: para escrever de novo, reabra — e a reabertura fica na linha do
     tempo, com quem reabriu e por quê. */
  if (isClosedTicketStatus(status)) {
    return type === 'reopening'
      ? null
      : 'Este chamado está encerrado. Reabra-o antes de registrar um novo histórico.';
  }

  return refuseOnOpenTicket(status, type);
}

/** As recusas de um chamado que ainda está em andamento. */
function refuseOnOpenTicket(status: TicketStatus, type: TicketHistoryType): string | null {
  if (type === 'reopening') return 'Só dá para reabrir um chamado que já foi encerrado.';

  if (type === 'start' && status !== 'open') {
    return 'O atendimento deste chamado já foi iniciado.';
  }

  if (type === 'resume' && !isWaitingTicketStatus(status)) {
    return 'Só dá para retomar um chamado que está aguardando alguém.';
  }

  return null;
}

/** Os tipos que o seletor oferece para um chamado neste estágio, na ordem de tela. */
export function availableTicketHistoryTypes(status: TicketStatus): ManualTicketHistoryType[] {
  return MANUAL_TICKET_HISTORY_TYPES.filter((type) => refuseTicketHistory(status, type) === null);
}
