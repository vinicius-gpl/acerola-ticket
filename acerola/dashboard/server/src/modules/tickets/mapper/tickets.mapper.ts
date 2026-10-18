import { type TicketAttachment } from '@template/shared/schemas/ticket-attachment.schema';
import { type TicketArea } from '@template/shared/domain/ticket-catalog.util';
import { formatTicketProtocol } from '@template/shared/domain/ticket-protocol.util';
import { type PublicTicketHistory } from '@template/shared/schemas/ticket-history.schema';
import {
  type CreateTicketInput,
  type MyTicket,
  type PublicTicket,
  type Ticket,
  type UpdateTicketInput,
} from '@template/shared/schemas/ticket.schema';

import { mapDefined, setIfDefined } from '../../../lib/db/partial-update.util';
import { type TicketInsert, type TicketRow } from '../../../lib/db/schema/tickets.schema';
import { type TicketWithComputer } from '../repository/tickets.repository';

/**
 * A tradução entre a linha do banco e o contrato. Mora aqui, e não espalhada, porque é aqui
 * que se decide o formato de data que TODA tela recebe.
 *
 * O link do print entra por parâmetro, já assinado: gerar link é ida ao R2, e uma função de
 * tradução que faz chamada de rede não dá para testar sem subir nada.
 */
function toNullableIsoString(date?: Date | null): string | null {
  if (!date) return null;
  return date.toISOString();
}

function resolveTicketProjectMeta(row: TicketWithComputer) {
  return {
    projectId: row.projectId ?? null,
    projectName: row.projectName ?? null,
    githubIssueNumber: row.githubIssueNumber ?? null,
    githubIssueUrl: row.githubIssueUrl ?? null,
  };
}

export function toTicket(
  row: TicketWithComputer,
  screenshotUrl: string | null,
  participantAreas: readonly TicketArea[] = [],
): Ticket {
  const projectMeta = resolveTicketProjectMeta(row);

  return {
    id: row.id,
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
    ...projectMeta,
    assignee: row.assignee,
    assigneeId: row.assigneeId,
    solution: row.solution,
    createdAt: row.createdAt.toISOString(),
    startedAt: toNullableIsoString(row.startedAt),
    resolvedAt: toNullableIsoString(row.resolvedAt),
    updatedAt: toNullableIsoString(row.updatedAt),
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

/** A conta do Neon Auth que abriu o chamado. */
export type TicketRequester = { id: string; email: string; name: string };

/** Um chamado na lista "Meus chamados" — só o resumo. */
export function toMyTicket(row: TicketRow): MyTicket {
  return {
    id: row.id,
    protocol: formatTicketProtocol(row.id),
    status: row.status,
    priority: row.priority,
    area: row.area,
    problemType: row.problemType,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
  };
}

function requesterColumns(input: CreateTicketInput, requester: TicketRequester | null | undefined) {
  if (!requester) {
    return { requesterId: null, requesterEmail: null, requesterName: input.requesterName.trim() };
  }

  return {
    requesterId: requester.id,
    requesterEmail: requester.email,
    requesterName: requester.name.trim(),
  };
}

/**
 * O chamado recém-aberto. A situação NÃO vem do corpo: o padrão da coluna é `open`, e é ele
 * que vale. A chave do print vem de quem guardou o arquivo, não de quem enviou o formulário.
 */
export function toTicketInsert(
  input: CreateTicketInput,
  screenshotKey: string | null,
  /* O responsável JÁ CONFERIDO pelo service (quem atende a área). O nome vem do cadastro
     dele, nunca do corpo: `input.assigneeId` sozinho não é de confiança. */
  assignee: { id: string; name: string } | null = null,
  /* Quem abriu, pela IDENTIDADE — o nome do corpo só vale para quem entra sem login (o bot do
     WhatsApp). Pela tela, o nome é o da conta, e o formulário nem deixa mudá-lo. */
  requester?: TicketRequester | null,
): TicketInsert {
  return {
    assignee: assignee?.name ?? null,
    assigneeId: assignee?.id ?? null,
    ...requesterColumns(input, requester),
    area: input.area,
    department: input.department,
    problemType: input.problemType,
    anydeskId: normalizeOptional(input.anydeskId) ?? null,
    priority: input.priority ?? 'medium',
    contactPhone: input.contactPhone.trim(),
    notifyWhatsapp: input.notifyWhatsapp === true || input.notifyWhatsapp === 'true',
    description: input.description.trim(),
    screenshotKey,
    projectId: input.projectId ? Number(input.projectId) : null,
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
  /* O novo responsável, já conferido pelo service (só o super admin troca). Ausente = não mexe. */
  assignee?: { id: string; name: string },
): Partial<TicketInsert> {
  const update: Partial<TicketInsert> = { updatedAt: now, updatedBy: actorEmail };

  if (assignee) {
    update.assignee = assignee.name;
    update.assigneeId = assignee.id;
  }

  setIfDefined(update, 'priority', input.priority);
  /* Reclassificar a área — a policy (`TicketsService.update`) já confirmou que quem pediu
     pode. Aqui é só gravar. */
  setIfDefined(update, 'area', input.area);
  /* Quem abre escolhe o tipo pelo que parece; quem atende descobre o que era. Sem esta
     correção, o mapa de "o que mais dá problema" fica torto para sempre. */
  setIfDefined(update, 'problemType', input.problemType);
  /* Nulo aqui DESVINCULA a máquina — é como se desfaz um vínculo errado. */
  setIfDefined(update, 'computerId', input.computerId);
  /* Nulo aqui DESVINCULA o projeto de software */
  setIfDefined(update, 'projectId', input.projectId);

  return update;
}

/** Texto opcional só com espaço vira nulo: "" e nulo significando a mesma coisa confunde a busca. */
function normalizeOptional(value: string | null | undefined): string | null | undefined {
  return mapDefined(value, (text) => text.trim() || null);
}
