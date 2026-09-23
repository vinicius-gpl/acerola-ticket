import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type TicketStatus } from '@template/shared/domain/ticket-status.util';
import {
  type CreateTicketInput,
  type PublicTicket,
  type Ticket,
  type UpdateTicketInput,
} from '@template/shared/schemas/ticket.schema';

import { mapDefined, setIfDefined } from '../../../lib/db/partial-update.util';
import { type TicketInsert, type TicketRow } from '../../../lib/db/schema/tickets.schema';

/**
 * A tradução entre a linha do banco e o contrato. Mora aqui, e não espalhada, porque é aqui
 * que se decide o formato de data que TODA tela recebe.
 *
 * O link do print entra por parâmetro, já assinado: gerar link é ida ao R2, e uma função de
 * tradução que faz chamada de rede não dá para testar sem subir nada.
 */
export function toTicket(row: TicketRow, screenshotUrl: string | null): Ticket {
  return {
    id: row.id,
    /* O protocolo vem pronto do servidor: se cada tela formatasse por conta própria, o
       número do aviso sairia diferente do número da tela. */
    protocol: formatTicketProtocol(row.id),
    status: row.status,
    priority: row.priority,
    requesterName: row.requesterName,
    department: row.department,
    problemType: row.problemType,
    anydeskId: row.anydeskId,
    contactPhone: row.contactPhone,
    notifyWhatsapp: row.notifyWhatsapp,
    description: row.description,
    screenshotUrl,
    assignee: row.assignee,
    solution: row.solution,
    /* O contrato publica data como texto ISO; o Drizzle devolve `Date`. Converter em cada
       tela faria cada uma inventar o próprio formato. */
    createdAt: row.createdAt.toISOString(),
    startedAt: row.startedAt?.toISOString() ?? null,
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt?.toISOString() ?? null,
    updatedBy: row.updatedBy,
  };
}

/**
 * O mesmo chamado, como quem o abriu o enxerga na consulta por protocolo.
 *
 * Montado a partir de `toTicket` e podado depois: é o que impede um campo novo do painel de
 * aparecer na consulta pública só porque alguém o acrescentou ao contrato e esqueceu daqui.
 */
export function toPublicTicket(row: TicketRow, screenshotUrl: string | null): PublicTicket {
  const ticket = toTicket(row, screenshotUrl);

  return {
    id: ticket.id,
    protocol: ticket.protocol,
    status: ticket.status,
    priority: ticket.priority,
    requesterName: ticket.requesterName,
    department: ticket.department,
    problemType: ticket.problemType,
    anydeskId: ticket.anydeskId,
    description: ticket.description,
    screenshotUrl: ticket.screenshotUrl,
    createdAt: ticket.createdAt,
  };
}

/**
 * O chamado recém-aberto. A situação NÃO vem do corpo: o padrão da coluna é `open`, e é ele
 * que vale. A chave do print vem de quem guardou o arquivo, não de quem enviou o formulário.
 */
export function toTicketInsert(
  input: CreateTicketInput,
  screenshotKey: string | null,
): TicketInsert {
  return {
    requesterName: input.requesterName.trim(),
    department: input.department,
    problemType: input.problemType,
    anydeskId: normalizeOptional(input.anydeskId) ?? null,
    priority: input.priority ?? 'medium',
    contactPhone: input.contactPhone.trim(),
    notifyWhatsapp: input.notifyWhatsapp === true || input.notifyWhatsapp === 'true',
    description: input.description.trim(),
    screenshotKey,
  };
}

/**
 * O atendimento. `updatedBy` e `updatedAt` são SEMPRE recarimbados — mesmo que o corpo tente
 * mandar outro valor.
 *
 * `now` entra por parâmetro para o carimbo não depender de um relógio escondido: é o que
 * permite testar a transição sem que o resultado mude conforme a hora em que o teste rodou.
 */
export function toTicketUpdate(
  input: UpdateTicketInput,
  actorEmail: string,
  current: TicketRow,
  now: Date = new Date(),
): Partial<TicketInsert> {
  const update: Partial<TicketInsert> = { updatedAt: now, updatedBy: actorEmail };

  setIfDefined(update, 'priority', input.priority);
  setIfDefined(update, 'assignee', normalizeOptional(input.assignee));
  setIfDefined(update, 'solution', normalizeOptional(input.solution));
  setIfDefined(update, 'status', input.status);

  stampTransition(update, input.status, current, now);

  return update;
}

/**
 * Os carimbos de QUANDO o atendimento começou e terminou.
 *
 * São colunas próprias, e não deduções a partir de `updated_at`, porque qualquer correção de
 * texto move o `updated_at` — e o indicador de tempo médio passaria a medir a última vez que
 * alguém salvou, não quando o problema foi resolvido.
 *
 * Reabrir um chamado limpa a data de resolução: um chamado que voltou para a fila não está
 * resolvido, e mantê-la faria ele entrar na média como se estivesse.
 */
function stampTransition(
  update: Partial<TicketInsert>,
  nextStatus: TicketStatus | undefined,
  current: TicketRow,
  now: Date,
): void {
  if (!nextStatus) return;
  if (nextStatus === current.status) return;

  /* Resolver direto de "aberto" também marca o início: sem isso, um chamado rápido ficaria
     sem registro de quando alguém pegou. */
  if (!current.startedAt && nextStatus !== 'open' && nextStatus !== 'cancelled') {
    update.startedAt = now;
  }

  if (nextStatus === 'resolved') {
    update.resolvedAt = current.resolvedAt ?? now;

    return;
  }

  if (current.resolvedAt) update.resolvedAt = null;
}

/** Texto opcional só com espaço vira nulo: "" e nulo significando a mesma coisa confunde a busca. */
function normalizeOptional(value: string | null | undefined): string | null | undefined {
  return mapDefined(value, (text) => text.trim() || null);
}
