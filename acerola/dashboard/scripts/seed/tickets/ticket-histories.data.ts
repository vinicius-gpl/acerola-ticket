import {
  isClosedTicketStatus,
  isWaitingTicketStatus,
  type TicketStatus,
} from '@template/shared/domain/ticket-status.util';
import { type TicketHistoryType } from '@template/shared/domain/ticket-history.util';

import { type TicketHistoryInsert } from '../../../server/src/lib/db/schema/ticket-histories.schema';
import { type TicketInsert } from '../../../server/src/lib/db/schema/tickets.schema';

/**
 * A LINHA DO TEMPO dos chamados de teste.
 *
 * A maioria é DERIVADA do próprio chamado (`derivedTimeline`): a abertura, o início e o
 * encerramento saem dos carimbos que o chamado já tem. É o que mantém os dois coerentes — um
 * chamado "resolvido" sem histórico de solução seria justamente o estado que o sistema não
 * deixa existir.
 *
 * Alguns são ESCRITOS À MÃO (`HANDWRITTEN_TIMELINES`), para a tela ter o que mostrar: uma ordem
 * de serviço com espera por peça, retomada, andamento interno e encerramento com ressalva.
 *
 * Dado INVENTADO, sempre — ver `tickets.data.ts`.
 */
const ATTENDANT = 'suporte@azuos.local';
const ATTENDANT_NAME = 'Suporte TI';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** O tempo registrado num atendimento de teste nunca passa disto: ninguém lança "três dias". */
const MAX_SEED_MINUTES = 240;

/** O histórico que ENCERRA, para cada estágio encerrado. */
const CLOSING_TYPE_OF: Partial<Record<TicketStatus, TicketHistoryType>> = {
  resolved: 'resolution',
  resolved_with_caveats: 'closure_with_caveats',
  cancelled: 'cancellation',
};

const DEFAULT_CLOSING_TEXT: Partial<Record<TicketStatus, string>> = {
  resolved: 'Chamado resolvido.',
  resolved_with_caveats: 'Chamado encerrado com ressalva.',
  cancelled: 'Chamado cancelado.',
};

const WAITING_TEXT: Partial<Record<TicketStatus, string>> = {
  waiting_requester: 'Aguardando a pessoa confirmar um horário para o atendimento.',
  waiting_third_party: 'Peça solicitada ao fornecedor. Aguardando a entrega.',
};

type SeedTicket = TicketInsert & { id: number };

function byAttendant(
  ticket: SeedTicket,
  entry: Pick<TicketHistoryInsert, 'type' | 'description' | 'statusAfter' | 'createdAt'> &
    Partial<Pick<TicketHistoryInsert, 'minutesSpent' | 'isVisibleToRequester'>>,
): TicketHistoryInsert {
  return {
    ticketId: ticket.id,
    isVisibleToRequester: true,
    authorName: ticket.assignee ?? ATTENDANT_NAME,
    createdBy: ATTENDANT,
    ...entry,
  };
}

function openingOf(ticket: SeedTicket): TicketHistoryInsert {
  return {
    ticketId: ticket.id,
    type: 'opening',
    description: 'Chamado aberto.',
    statusAfter: 'open',
    isVisibleToRequester: true,
    authorName: ticket.requesterName,
    createdBy: null,
    createdAt: ticket.createdAt ?? new Date(),
  };
}

/** Quanto tempo o atendimento registrou: do início ao fim, com teto. */
function minutesBetween(start: Date | null | undefined, end: Date): number | null {
  if (!start || end <= start) return null;

  return Math.min(MAX_SEED_MINUTES, Math.round((end.getTime() - start.getTime()) / MINUTE));
}

/**
 * A linha do tempo que os carimbos do chamado contam: abertura, início (quando houve um antes
 * do encerramento), espera (quando está esperando) e encerramento (quando encerrou).
 */
export function derivedTimeline(ticket: SeedTicket): TicketHistoryInsert[] {
  const status = ticket.status ?? 'open';
  const createdAt = ticket.createdAt ?? new Date();
  const closedAt = ticket.resolvedAt ?? ticket.updatedAt ?? createdAt;
  const timeline = [openingOf(ticket)];

  const startedAt = ticket.startedAt;
  if (startedAt && (!isClosedTicketStatus(status) || startedAt < closedAt)) {
    timeline.push(
      byAttendant(ticket, {
        type: 'start',
        description: 'Atendimento iniciado.',
        statusAfter: 'in_progress',
        createdAt: startedAt,
      }),
    );
  }

  if (isWaitingTicketStatus(status)) {
    timeline.push(
      byAttendant(ticket, {
        type: status as TicketHistoryType,
        description: WAITING_TEXT[status] ?? 'Aguardando.',
        statusAfter: status,
        createdAt: ticket.updatedAt ?? new Date((startedAt ?? createdAt).getTime() + HOUR),
      }),
    );
  }

  const closingType = CLOSING_TYPE_OF[status];
  if (closingType) {
    timeline.push(
      byAttendant(ticket, {
        type: closingType,
        description: ticket.solution ?? DEFAULT_CLOSING_TEXT[status] ?? 'Chamado encerrado.',
        statusAfter: status,
        createdAt: closedAt,
        minutesSpent: minutesBetween(startedAt, closedAt),
      }),
    );
  }

  return timeline;
}

const at = (value: string) => new Date(value);

/**
 * As ordens de serviço escritas à mão — a história completa de três chamados (ver os ids 27,
 * 28 e 29 em `tickets.data.ts`). Substituem a linha do tempo derivada desses chamados.
 */
export const HANDWRITTEN_TIMELINES: Record<number, Omit<TicketHistoryInsert, 'ticketId'>[]> = {
  /* Aguardando SOLICITANTE: o TI fez a parte dele e depende de quem abriu. */
  27: [
    {
      type: 'opening',
      description: 'Chamado aberto.',
      statusAfter: 'open',
      authorName: 'Otávio Brandão',
      createdBy: null,
      createdAt: at('2026-09-24T12:00:00.000Z'),
    },
    {
      type: 'start',
      description: 'Assumi o chamado. Vou acessar a máquina pelo AnyDesk para ver o erro.',
      statusAfter: 'in_progress',
      authorName: ATTENDANT_NAME,
      createdBy: ATTENDANT,
      createdAt: at('2026-09-24T12:30:00.000Z'),
      minutesSpent: 10,
    },
    {
      type: 'waiting_requester',
      description:
        'Tentei o acesso remoto duas vezes e a máquina estava desligada. Preciso que a pessoa ' +
        'avise um horário em que estará na mesa.',
      statusAfter: 'waiting_requester',
      authorName: ATTENDANT_NAME,
      createdBy: ATTENDANT,
      createdAt: at('2026-09-24T14:00:00.000Z'),
      minutesSpent: 15,
    },
  ],

  /* Aguardando TERCEIRO: peça pedida, com o bastidor (cotação) escondido de quem abriu. */
  28: [
    {
      type: 'opening',
      description: 'Chamado aberto.',
      statusAfter: 'open',
      authorName: 'Priscila Azevedo',
      createdBy: null,
      createdAt: at('2026-09-23T11:00:00.000Z'),
    },
    {
      type: 'start',
      description: 'Assumi o chamado. A fonte do computador não liga nem com outro cabo.',
      statusAfter: 'in_progress',
      authorName: ATTENDANT_NAME,
      createdBy: ATTENDANT,
      createdAt: at('2026-09-23T11:40:00.000Z'),
      minutesSpent: 30,
    },
    {
      type: 'note',
      description: 'Cotei a fonte com dois fornecedores. O segundo entrega em três dias úteis.',
      statusAfter: 'in_progress',
      /* Caso limite: histórico INTERNO — não aparece na consulta pública por protocolo. */
      isVisibleToRequester: false,
      authorName: ATTENDANT_NAME,
      createdBy: ATTENDANT,
      createdAt: at('2026-09-23T13:10:00.000Z'),
      minutesSpent: 25,
    },
    {
      type: 'waiting_third_party',
      description: 'Fonte nova pedida ao fornecedor. Emprestei um computador reserva enquanto ela não chega.',
      statusAfter: 'waiting_third_party',
      authorName: ATTENDANT_NAME,
      createdBy: ATTENDANT,
      createdAt: at('2026-09-23T13:30:00.000Z'),
      minutesSpent: 20,
    },
  ],

  /* A história inteira: esperou a peça, retomou e encerrou COM RESSALVA. */
  29: [
    {
      type: 'opening',
      description: 'Chamado aberto.',
      statusAfter: 'open',
      authorName: 'Quitéria Sampaio',
      createdBy: null,
      createdAt: at('2026-09-17T11:00:00.000Z'),
    },
    {
      type: 'start',
      description: 'Assumi o chamado. O rolete de tração está gasto e a bandeja 2 não trava.',
      statusAfter: 'in_progress',
      authorName: ATTENDANT_NAME,
      createdBy: ATTENDANT,
      createdAt: at('2026-09-17T11:30:00.000Z'),
      minutesSpent: 40,
    },
    {
      type: 'waiting_third_party',
      description: 'Rolete pedido ao fornecedor. A impressora segue funcionando só pela bandeja 1.',
      statusAfter: 'waiting_third_party',
      authorName: ATTENDANT_NAME,
      createdBy: ATTENDANT,
      createdAt: at('2026-09-17T12:20:00.000Z'),
      minutesSpent: 15,
    },
    {
      type: 'resume',
      description: 'O rolete chegou. Retomando o atendimento.',
      statusAfter: 'in_progress',
      authorName: ATTENDANT_NAME,
      createdBy: ATTENDANT,
      createdAt: at('2026-09-22T12:00:00.000Z'),
    },
    {
      type: 'closure_with_caveats',
      description:
        'Troquei o rolete de tração e a impressora voltou a puxar papel. A bandeja 2 continua ' +
        'sem travar: a peça não é mais fabricada — usar só a bandeja 1.',
      statusAfter: 'resolved_with_caveats',
      authorName: ATTENDANT_NAME,
      createdBy: ATTENDANT,
      createdAt: at('2026-09-22T13:10:00.000Z'),
      minutesSpent: 70,
    },
  ],
};

/** A linha do tempo de um chamado de teste: a escrita à mão, quando existe; senão, a derivada. */
export function timelineOf(ticket: TicketInsert): TicketHistoryInsert[] {
  const seeded = ticket as SeedTicket;
  const handwritten = HANDWRITTEN_TIMELINES[seeded.id];
  if (!handwritten) return derivedTimeline(seeded);

  return handwritten.map((history) => ({ ...history, ticketId: seeded.id }));
}
