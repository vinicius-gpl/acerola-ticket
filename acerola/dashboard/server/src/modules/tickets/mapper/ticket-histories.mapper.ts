import {
  ticketAreaLabel,
  ticketProblemTypeLabel,
} from '@template/shared/domain/ticket-catalog.util';
import {
  isClosingTicketHistoryType,
  nextTicketStatus,
} from '@template/shared/domain/ticket-history.util';
import {
  isSolvedTicketStatus,
  ticketPriorityLabel,
  ticketStatusPhase,
} from '@template/shared/domain/ticket-status.util';
import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import {
  type createTicketHistorySchema,
  type PublicTicketHistory,
  type TicketHistory,
} from '@template/shared/schemas/ticket-history.schema';
import { type z } from 'zod';

import {
  type TicketHistoryInsert,
  type TicketHistoryRow,
} from '../../../lib/db/schema/ticket-histories.schema';
import { type TicketInsert, type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { type TicketWithComputer } from '../repository/tickets.repository';

/** Quem está lançando: o nome que fica escrito e a identidade (e-mail) que fica de prova. */
export type HistoryAuthor = { name: string; email: string };

/** O que a pessoa informou ao lançar — já validado (e normalizado) pelo contrato. */
export type HistoryEntry = z.infer<typeof createTicketHistorySchema>;

export function toTicketHistory(
  row: TicketHistoryRow,
  attachments: TicketAttachment[] = [],
): TicketHistory {
  return {
    id: row.id,
    ticketId: row.ticketId,
    type: row.type,
    description: row.description,
    statusAfter: row.statusAfter,
    isVisibleToRequester: row.isVisibleToRequester,
    minutesSpent: row.minutesSpent,
    authorName: row.authorName,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    attachments,
  };
}

/**
 * O histórico como quem abriu o chamado o enxerga.
 *
 * Montado campo a campo, e não espalhando o histórico inteiro: é o que impede um campo novo
 * do painel de aparecer na consulta pública só porque alguém o acrescentou ao contrato.
 */
export function toPublicTicketHistory(history: TicketHistory): PublicTicketHistory {
  return {
    id: history.id,
    type: history.type,
    description: history.description,
    statusAfter: history.statusAfter,
    authorName: history.authorName,
    createdAt: history.createdAt,
    attachments: history.attachments,
  };
}

/**
 * A ABERTURA, registrada pelo sistema quando o chamado nasce.
 *
 * O autor é quem abriu, com o nome que digitou — e sem identidade, porque o formulário é
 * público. A descrição do problema NÃO é copiada para cá: ela já está no chamado, e duas
 * cópias do mesmo texto acabam diferentes.
 */
export function toOpeningHistory(ticket: TicketRow): TicketHistoryInsert {
  return {
    ticketId: ticket.id,
    type: 'opening',
    description: 'Chamado aberto.',
    statusAfter: ticket.status,
    isVisibleToRequester: true,
    authorName: ticket.requesterName,
    createdBy: null,
    createdAt: ticket.createdAt,
  };
}

/** O histórico que uma pessoa lança. O estágio resultante é consequência do tipo. */
export function toHistoryInsert(
  ticket: TicketRow,
  entry: HistoryEntry,
  author: HistoryAuthor,
  now: Date = new Date(),
): TicketHistoryInsert {
  return {
    ticketId: ticket.id,
    type: entry.type,
    description: entry.description.trim(),
    statusAfter: nextTicketStatus(ticket.status, entry.type),
    isVisibleToRequester: entry.isVisibleToRequester,
    minutesSpent: entry.minutesSpent ?? null,
    authorName: author.name,
    createdBy: author.email,
    createdAt: now,
  };
}

/**
 * O que um histórico MUDA no chamado: o estágio e os carimbos que saem dele.
 *
 * Nenhuma decisão aqui pergunta pelo NOME de um tipo ou de um estágio — só pelo que o catálogo
 * diz deles (encerra? resolve? em que momento fica?). É o que deixa um tipo novo funcionar sem
 * ninguém voltar a este arquivo.
 *
 * `now` entra por parâmetro para o carimbo não depender de um relógio escondido.
 */
export function toTicketMove(
  ticket: TicketRow,
  entry: Pick<HistoryEntry, 'type' | 'description'>,
  author: HistoryAuthor,
  now: Date = new Date(),
): Partial<TicketInsert> {
  const move: Partial<TicketInsert> = { updatedAt: now, updatedBy: author.email };
  const next = nextTicketStatus(ticket.status, entry.type);

  /* Quem lança o primeiro histórico num chamado sem responsável vira o responsável: é a
     resposta para "quem pegou isso?" sem depender de alguém lembrar de preencher o campo. */
  if (!ticket.assignee) move.assignee = author.name;

  if (next === ticket.status) return move;

  move.status = next;
  stampStart(move, ticket, next, now);
  stampResolution(move, ticket, next, now);

  if (isClosingTicketHistoryType(entry.type)) {
    /* O texto do histórico que encerrou é "o que foi feito" — a fila e o relatório o leem do
       chamado, sem precisar varrer a linha do tempo de cada um. */
    move.solution = entry.description.trim();

    return move;
  }

  /* Saiu de um estágio encerrado (uma reabertura): a solução antiga não vale mais. Ela não se
     perde — continua escrita no histórico que a registrou. */
  if (ticketStatusPhase(ticket.status) === 'closed') move.solution = null;

  return move;
}

/**
 * QUANDO o atendimento começou.
 *
 * Marca na primeira vez que o chamado sai da fila para um estágio em que o TI de fato pegou —
 * inclusive resolvido direto de "aberto". Cancelar antes de alguém tocar não é começar.
 */
function stampStart(
  move: Partial<TicketInsert>,
  ticket: TicketRow,
  next: TicketRow['status'],
  now: Date,
): void {
  if (ticket.startedAt) return;

  const phase = ticketStatusPhase(next);
  if (phase === 'queue') return;
  if (phase === 'closed' && !isSolvedTicketStatus(next)) return;

  move.startedAt = now;
}

/**
 * QUANDO o problema foi resolvido — é o que o indicador de tempo médio mede.
 *
 * Só estágio RESOLVIDO carimba; cancelado encerra, mas não resolve. E sair de um estágio
 * resolvido limpa a data: um chamado que voltou para a fila não está resolvido, e mantê-la
 * faria ele entrar na média como se estivesse.
 */
function stampResolution(
  move: Partial<TicketInsert>,
  ticket: TicketRow,
  next: TicketRow['status'],
  now: Date,
): void {
  if (isSolvedTicketStatus(next)) {
    move.resolvedAt = now;

    return;
  }

  if (ticket.resolvedAt) move.resolvedAt = null;
}

const NONE = 'nenhum';

/**
 * O que mudou nos DADOS do chamado, em frases de tela — o texto do histórico de "Alteração de
 * dados" que o sistema lança sozinho.
 *
 * Compara o chamado de antes com o de depois, e não o corpo da requisição: mandar o mesmo
 * valor que já estava não é uma alteração, e não merece uma linha na linha do tempo.
 * Devolve nulo quando nada mudou de verdade.
 */
export function describeTicketChanges(
  before: TicketWithComputer,
  after: TicketWithComputer,
): string | null {
  const changes: string[] = [];
  const note = (label: string, from: string, to: string) => {
    if (from !== to) changes.push(`${label}: ${from} → ${to}`);
  };

  note('Urgência', ticketPriorityLabel(before.priority), ticketPriorityLabel(after.priority));
  note('Área', ticketAreaLabel(before.area), ticketAreaLabel(after.area));
  note(
    'Tipo de problema',
    ticketProblemTypeLabel(before.problemType),
    ticketProblemTypeLabel(after.problemType),
  );
  note('Máquina', before.computerName ?? NONE, after.computerName ?? NONE);
  note('Responsável', before.assignee ?? NONE, after.assignee ?? NONE);

  return changes.length > 0 ? changes.join('\n') : null;
}

/** O histórico de "Alteração de dados". Interno: quem abriu o chamado não precisa vê-lo. */
export function toUpdateHistory(
  ticket: TicketRow,
  description: string,
  author: HistoryAuthor,
  now: Date = new Date(),
): TicketHistoryInsert {
  return {
    ticketId: ticket.id,
    type: 'update',
    description,
    statusAfter: ticket.status,
    isVisibleToRequester: false,
    authorName: author.name,
    createdBy: author.email,
    createdAt: now,
  };
}
