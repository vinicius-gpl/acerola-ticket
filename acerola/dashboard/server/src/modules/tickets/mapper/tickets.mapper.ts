import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import { type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type PublicTicketHistory } from '@template/shared/schemas/ticket-history.schema';
import {
  type CreateTicketInput,
  type PublicTicket,
  type Ticket,
  type UpdateTicketInput,
} from '@template/shared/schemas/ticket.schema';

import { mapDefined, setIfDefined } from '../../../lib/db/partial-update.util';
import { type TicketInsert } from '../../../lib/db/schema/tickets.schema';
import { type TicketWithComputer } from '../repository/tickets.repository';

/**
 * A tradução entre a linha do banco e o contrato. Mora aqui, e não espalhada, porque é aqui
 * que se decide o formato de data que TODA tela recebe.
 *
 * O link do print entra por parâmetro, já assinado: gerar link é ida ao R2, e uma função de
 * tradução que faz chamada de rede não dá para testar sem subir nada.
 */
export function toTicket(
  row: TicketWithComputer,
  screenshotUrl: string | null,
  participantAreas: readonly TicketArea[] = [],
): Ticket {
  return {
    id: row.id,
    /* O protocolo vem pronto do servidor: se cada tela formatasse por conta própria, o
       número do aviso sairia diferente do número da tela. */
    protocol: formatTicketProtocol(row.id),
    status: row.status,
    priority: row.priority,
    requesterName: row.requesterName,
    area: row.area,
    department: row.department,
    problemType: row.problemType,
    participantAreas: [...participantAreas],
    anydeskId: row.anydeskId,
    contactPhone: row.contactPhone,
    notifyWhatsapp: row.notifyWhatsapp,
    description: row.description,
    screenshotUrl,
    computerId: row.computerId,
    computerName: row.computerName,
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
export function toPublicTicket(
  row: TicketWithComputer,
  screenshotUrl: string | null,
  attachments: TicketAttachment[] = [],
  histories: PublicTicketHistory[] = [],
): PublicTicket {
  const ticket = toTicket(row, screenshotUrl);

  return {
    id: ticket.id,
    protocol: ticket.protocol,
    status: ticket.status,
    priority: ticket.priority,
    requesterName: ticket.requesterName,
    area: ticket.area,
    department: ticket.department,
    problemType: ticket.problemType,
    anydeskId: ticket.anydeskId,
    description: ticket.description,
    screenshotUrl: ticket.screenshotUrl,
    attachments,
    histories,
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
    area: input.area,
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
 * A correção dos DADOS do chamado. `updatedBy` e `updatedAt` são SEMPRE recarimbados — mesmo
 * que o corpo tente mandar outro valor.
 *
 * O estágio, a solução e os carimbos de início e de resolução NÃO passam por aqui: eles só
 * mudam por um histórico lançado (ver `toTicketMove`, em `ticket-histories.mapper`).
 *
 * `now` entra por parâmetro para o carimbo não depender de um relógio escondido.
 */
export function toTicketUpdate(
  input: UpdateTicketInput,
  actorEmail: string,
  now: Date = new Date(),
): Partial<TicketInsert> {
  const update: Partial<TicketInsert> = { updatedAt: now, updatedBy: actorEmail };

  setIfDefined(update, 'priority', input.priority);
  /* Reclassificar a área — a policy (`TicketsService.update`) já confirmou que quem pediu
     pode. Aqui é só gravar. */
  setIfDefined(update, 'area', input.area);
  setIfDefined(update, 'assignee', normalizeOptional(input.assignee));
  /* Quem abre escolhe o tipo pelo que parece; quem atende descobre o que era. Sem esta
     correção, o mapa de "o que mais dá problema" fica torto para sempre. */
  setIfDefined(update, 'problemType', input.problemType);
  /* Nulo aqui DESVINCULA a máquina — é como se desfaz um vínculo errado. */
  setIfDefined(update, 'computerId', input.computerId);

  return update;
}

/** Texto opcional só com espaço vira nulo: "" e nulo significando a mesma coisa confunde a busca. */
function normalizeOptional(value: string | null | undefined): string | null | undefined {
  return mapDefined(value, (text) => text.trim() || null);
}
