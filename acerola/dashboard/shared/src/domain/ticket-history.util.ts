import {
  isClosedTicketStatus,
  ticketStatusLabel,
  ticketStatusPhase,
  type TicketPhase,
  type TicketStatus,
} from './ticket-status.util';

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
 */
export const TICKET_HISTORY_TYPES = [
  'opening',
  'start',
  'note',
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

export type TicketHistoryTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

/** Os momentos em que o chamado ainda está em andamento — tudo, menos encerrado. */
const WHILE_RUNNING: readonly TicketPhase[] = ['queue', 'working', 'waiting'];

/**
 * A FICHA de um tipo de histórico — tudo o que o sistema precisa saber sobre ele, num lugar só.
 *
 * **Se um tipo ENCERRA o chamado não é um campo desta ficha, de propósito.** Ele encerra quando
 * `leadsTo` aponta para um estágio encerrado (ver `ticket-status.util.ts`) — e só. Um
 * `closes: true` escrito à mão ao lado poderia dizer "encerra" de um tipo que leva para "em
 * atendimento", e o sistema teria duas verdades. Assim só existe uma: para onde ele leva.
 */
export type TicketHistoryDefinition = {
  /** O texto de tela (português). A chave é inglês, que o usuário não vê. */
  label: string;
  /** A cor vem do domínio: a mesma na linha do tempo, no seletor e no relatório. */
  tone: TicketHistoryTone;
  /**
   * Para qual estágio este histórico LEVA o chamado. `null` não muda o estágio: o histórico só
   * acrescenta à linha do tempo. É este campo que decide se o tipo encerra ou não.
   */
  leadsTo: TicketStatus | null;
  /**
   * Quem lança. `system` é registrado pelo próprio sistema (a abertura, a alteração de dados)
   * e nunca aparece no seletor — aceitá-lo do formulário deixaria alguém "abrir" um chamado
   * pela segunda vez.
   */
  origin: 'system' | 'person';
  /** Em quais momentos do chamado ele pode ser lançado (ver `TicketPhase`). */
  allowedIn: readonly TicketPhase[];
  /** O que dizer a quem tentar lançá-lo fora de hora, num chamado em andamento. */
  refusal: string;
};

/**
 * O CATÁLOGO DE TIPOS DE HISTÓRICO. Para criar um tipo novo:
 *
 *  1. acrescente a chave em `TICKET_HISTORY_TYPES`, acima (e em `MANUAL_TICKET_HISTORY_TYPES`,
 *     se uma pessoa puder lançá-lo — o teste acusa se você esquecer);
 *  2. acrescente a ficha dele aqui (o TypeScript recusa compilar enquanto faltar);
 *  3. gere a migration (`npm run db:generate`) — a checagem do banco sai desta mesma lista.
 *
 * Para um tipo novo que ENCERRA, basta apontar `leadsTo` para um estágio encerrado. O seletor
 * o coloca sozinho no grupo "Encerram o chamado", o botão passa a dizer "Encerrar chamado" e o
 * relatório o marca como encerramento — nada disso é escrito tipo a tipo.
 */
export const TICKET_HISTORY_CATALOG = {
  opening: {
    label: 'Abertura',
    tone: 'brand',
    leadsTo: 'open',
    origin: 'system',
    allowedIn: [],
    refusal: 'A abertura é registrada pelo próprio sistema.',
  },
  start: {
    label: 'Início do atendimento',
    tone: 'info',
    leadsTo: 'in_progress',
    origin: 'person',
    allowedIn: ['queue'],
    refusal: 'O atendimento deste chamado já foi iniciado.',
  },
  note: {
    label: 'Andamento',
    tone: 'neutral',
    leadsTo: null,
    origin: 'person',
    allowedIn: WHILE_RUNNING,
    refusal: 'Não dá para registrar um andamento neste chamado agora.',
  },
  waiting_requester: {
    label: 'Aguardando solicitante',
    tone: 'warning',
    leadsTo: 'waiting_requester',
    origin: 'person',
    allowedIn: WHILE_RUNNING,
    refusal: 'Não dá para pôr este chamado em espera agora.',
  },
  waiting_third_party: {
    label: 'Aguardando terceiro ou peça',
    tone: 'warning',
    leadsTo: 'waiting_third_party',
    origin: 'person',
    allowedIn: WHILE_RUNNING,
    refusal: 'Não dá para pôr este chamado em espera agora.',
  },
  resume: {
    label: 'Retomada',
    tone: 'info',
    leadsTo: 'in_progress',
    origin: 'person',
    allowedIn: ['waiting'],
    refusal: 'Só dá para retomar um chamado que está aguardando alguém.',
  },
  update: {
    label: 'Alteração de dados',
    tone: 'neutral',
    leadsTo: null,
    origin: 'system',
    allowedIn: [],
    refusal: 'A alteração de dados é registrada pelo próprio sistema.',
  },
  resolution: {
    label: 'Solução',
    tone: 'success',
    leadsTo: 'resolved',
    origin: 'person',
    allowedIn: WHILE_RUNNING,
    refusal: 'Não dá para encerrar este chamado agora.',
  },
  closure_with_caveats: {
    label: 'Encerramento com ressalva',
    tone: 'warning',
    leadsTo: 'resolved_with_caveats',
    origin: 'person',
    allowedIn: WHILE_RUNNING,
    refusal: 'Não dá para encerrar este chamado agora.',
  },
  cancellation: {
    label: 'Cancelamento',
    tone: 'danger',
    leadsTo: 'cancelled',
    origin: 'person',
    allowedIn: WHILE_RUNNING,
    refusal: 'Não dá para cancelar este chamado agora.',
  },
  reopening: {
    label: 'Reabertura',
    tone: 'info',
    leadsTo: 'in_progress',
    origin: 'person',
    allowedIn: ['closed'],
    refusal: 'Só dá para reabrir um chamado que já foi encerrado.',
  },
} as const satisfies Record<TicketHistoryType, TicketHistoryDefinition>;

function definitionOf(type: TicketHistoryType): TicketHistoryDefinition {
  return TICKET_HISTORY_CATALOG[type];
}

/** Os rótulos, tirados do catálogo — para quem precisa do mapa inteiro. */
export const TICKET_HISTORY_TYPE_LABELS = Object.fromEntries(
  TICKET_HISTORY_TYPES.map((type) => [type, TICKET_HISTORY_CATALOG[type].label]),
) as Record<TicketHistoryType, string>;

export function ticketHistoryTypeLabel(type: TicketHistoryType): string {
  return definitionOf(type).label;
}

export function ticketHistoryTone(type: TicketHistoryType): TicketHistoryTone {
  return definitionOf(type).tone;
}

/** Tipos que SÓ O SISTEMA lança (`origin: 'system'` no catálogo). */
export const SYSTEM_TICKET_HISTORY_TYPES: readonly TicketHistoryType[] =
  TICKET_HISTORY_TYPES.filter((type) => definitionOf(type).origin === 'system');

export function isSystemTicketHistoryType(type: TicketHistoryType): boolean {
  return definitionOf(type).origin === 'system';
}

/**
 * Os tipos que uma PESSOA escolhe ao lançar um histórico, na ordem em que o seletor mostra.
 *
 * É uma lista escrita, e não só um filtro do catálogo, porque o schema Zod precisa dela como
 * tipo exato. O teste garante que ela é exatamente os `origin: 'person'` do catálogo — um tipo
 * novo esquecido aqui reprova o teste, não some calado do formulário.
 */
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

/** O estágio do chamado DEPOIS deste histórico. */
export function nextTicketStatus(current: TicketStatus, type: TicketHistoryType): TicketStatus {
  return definitionOf(type).leadsTo ?? current;
}

/**
 * Este tipo ENCERRA o chamado?
 *
 * A resposta sai de para onde ele leva, nunca de uma marca própria: encerra quem leva o
 * chamado para um estágio encerrado. É a única definição de "encerrar" no sistema.
 */
export function isClosingTicketHistoryType(type: TicketHistoryType): boolean {
  const leadsTo = definitionOf(type).leadsTo;

  return leadsTo !== null && isClosedTicketStatus(leadsTo);
}

/** Históricos que encerram o chamado — a lista, tirada do catálogo. */
export const CLOSING_TICKET_HISTORY_TYPES: readonly TicketHistoryType[] =
  TICKET_HISTORY_TYPES.filter(isClosingTicketHistoryType);

/**
 * O EFEITO de um tipo, em uma palavra: `closes` encerra, `moves` muda de estágio sem encerrar,
 * `keeps` só acrescenta à linha do tempo. É por ele que a tela separa as opções em grupos e
 * troca o texto do botão.
 */
export type TicketHistoryEffect = 'closes' | 'moves' | 'keeps';

export function ticketHistoryEffect(type: TicketHistoryType): TicketHistoryEffect {
  if (isClosingTicketHistoryType(type)) return 'closes';

  return definitionOf(type).leadsTo === null ? 'keeps' : 'moves';
}

/**
 * O que este histórico vai FAZER com o chamado, numa frase de tela.
 *
 * Aparece embaixo do seletor de tipo, antes de a pessoa confirmar: a diferença entre registrar
 * um andamento e encerrar o chamado não pode depender de ela conhecer o nome de cada tipo.
 * A frase é montada do catálogo, então um tipo novo já nasce com a dele.
 */
export function ticketHistoryEffectLabel(type: TicketHistoryType): string {
  const leadsTo = definitionOf(type).leadsTo;
  if (leadsTo === null) return 'Não muda o estágio do chamado: só registra na linha do tempo.';

  const stage = ticketStatusLabel(leadsTo);

  return isClosedTicketStatus(leadsTo)
    ? `Encerra o chamado. Ele sai da fila como "${stage}".`
    : `Muda o estágio do chamado para "${stage}".`;
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
  const definition = definitionOf(type);
  if (definition.origin === 'system') return definition.refusal;

  const phase = ticketStatusPhase(status);
  if (definition.allowedIn.includes(phase)) return null;

  /* Encerrado é encerrado: para escrever de novo, reabra — e a reabertura fica na linha do
     tempo, com quem reabriu e por quê. Esta frase vale para qualquer tipo, por isso não é a
     recusa da ficha. */
  if (phase === 'closed') {
    return 'Este chamado está encerrado. Reabra-o antes de registrar um novo histórico.';
  }

  return definition.refusal;
}

/** Os tipos que o seletor oferece para um chamado neste estágio, na ordem de tela. */
export function availableTicketHistoryTypes(status: TicketStatus): ManualTicketHistoryType[] {
  return MANUAL_TICKET_HISTORY_TYPES.filter((type) => refuseTicketHistory(status, type) === null);
}

/**
 * As mesmas opções, já SEPARADAS pelo que fazem: as que dão andamento e as que encerram.
 *
 * É a forma que o seletor mostra — dois grupos com título, para "encerrar" nunca ficar
 * misturado no meio de "registrar andamento".
 */
export function ticketHistoryTypeGroups(status: TicketStatus): {
  continuing: ManualTicketHistoryType[];
  closing: ManualTicketHistoryType[];
} {
  const available = availableTicketHistoryTypes(status);

  return {
    continuing: available.filter((type) => !isClosingTicketHistoryType(type)),
    closing: available.filter(isClosingTicketHistoryType),
  };
}
