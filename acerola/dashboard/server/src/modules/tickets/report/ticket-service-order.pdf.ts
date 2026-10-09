import {
  ticketAreaLabel,
  ticketDepartmentLabel,
  ticketProblemTypeLabel,
} from '@template/shared/domain/ticket-catalog.util';
import {
  isClosingTicketHistoryType,
  ticketHistoryTone,
  ticketHistoryTypeLabel,
} from '@template/shared/domain/ticket-history.util';
import {
  ticketPriorityLabel,
  ticketPriorityTone,
  ticketStatusLabel,
  ticketStatusTone,
} from '@template/shared/domain/ticket-status.util';
import {
  serviceOrderVerifyPath,
  shortServiceOrderCode,
} from '@template/shared/domain/service-order.util';
import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
import QRCode from 'qrcode';

import { compileTypstDocument } from '../../../lib/report/typst/typst-compiler.util';
import { formatReportDate } from '../../../lib/report/report.util';
import { type TicketWithComputer } from '../repository/tickets.repository';

export type ServiceOrder = {
  ticket: TicketWithComputer;
  protocol: string;
  histories: readonly TicketHistory[];
};

/**
 * A EMISSÃO deste documento: o que o torna conferível.
 *
 * Tudo o que varia de um arquivo para outro entra por aqui — a data, quem emitiu, o código. O
 * desenho não lê o relógio nem sorteia nada: com a MESMA ordem e a MESMA emissão, o arquivo sai
 * byte a byte igual, e é isso que deixa o sistema conferir um PDF sem ter guardado o PDF.
 */
export type ServiceOrderIssue = {
  version: number;
  /** O código inteiro da emissão — vai no link. O papel mostra só o começo dele. */
  code: string;
  issuedAt: Date;
  issuedByName: string;
  /** O endereço da tela (sem barra no fim), para montar o link de conferência. */
  webOrigin: string;
};

const MINUTES_PER_HOUR = 60;
const EMPTY = '—';

/**
 * A ORDEM DE SERVIÇO de um chamado, compilada em Typst: os dados dele e a linha do tempo inteira.
 *
 * É um documento oficial que segue o padrão visual do sistema (template.typ + service-order.typ),
 * com logotipo Azuos, selos coloridos de status/prioridade, grade de atributos e QR code vetorial.
 */
export async function buildServiceOrderPdf(
  order: ServiceOrder,
  issue: ServiceOrderIssue,
): Promise<Buffer> {
  const shortCode = shortServiceOrderCode(issue.code);
  const verifyLink = verifyUrl(issue, issue.code);
  const verifyDisplay = verifyUrl(issue, shortCode);

  /* O QR code leva o código CURTO: com o inteiro ele ficaria miúdo demais para a câmera ler
     num rodapé. É só para o papel impresso — na tela, o link (com o código inteiro) resolve. */
  const qrSvg = await QRCode.toString(verifyDisplay, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'M',
  });

  const fields = fieldsOf(order).map((field) => [field.label, field.value]);

  const historyEntries = order.histories.map((history) => ({
    type: ticketHistoryTypeLabel(history.type),
    tone: ticketHistoryTone(history.type),
    author: history.authorName,
    date: formatReportDate(new Date(history.createdAt)),
    minutes: history.minutesSpent,
    description: history.description,
    details: detailsOf(history),
    attachments:
      history.attachments.length > 0
        ? history.attachments.map((attachment) => attachment.fileName).join(', ')
        : '',
  }));

  const data = {
    protocol: order.protocol,
    status: ticketStatusLabel(order.ticket.status),
    statusTone: ticketStatusTone(order.ticket.status),
    priority: ticketPriorityLabel(order.ticket.priority),
    priorityTone: ticketPriorityTone(order.ticket.priority),
    area: ticketAreaLabel(order.ticket.area),
    department: ticketDepartmentLabel(order.ticket.department),
    fields,
    problemLabel: ticketProblemTypeLabel(order.ticket.problemType),
    description: order.ticket.description,
    solution: order.ticket.solution ?? '',
    resolvedAt: order.ticket.resolvedAt ? formatReportDate(order.ticket.resolvedAt) : '',
    technician: order.ticket.assignee ?? '',
    histories: historyEntries,
    verifyUrl: verifyLink,
    verifyDisplayUrl: verifyDisplay,
    code: shortCode,
    version: issue.version.toString(),
    issuedByName: issue.issuedByName,
    issuedAt: formatReportDate(issue.issuedAt),
    qrSvg,
  };

  return compileTypstDocument({
    documentPath: 'documents/service-order.typ',
    data,
    creationTimestamp: issue.issuedAt,
  });
}

function verifyUrl(issue: ServiceOrderIssue, reference: string): string {
  return `${issue.webOrigin}${serviceOrderVerifyPath(reference)}`;
}

type Field = { label: string; value: string };

function fieldsOf({ ticket, histories }: ServiceOrder): Field[] {
  return [
    { label: 'Quem abriu', value: ticket.requesterName },
    { label: 'Telefone', value: ticket.contactPhone ?? EMPTY },
    { label: 'Departamento', value: ticketDepartmentLabel(ticket.department) },
    { label: 'Área', value: ticketAreaLabel(ticket.area) },
    { label: 'Tipo de problema', value: ticketProblemTypeLabel(ticket.problemType) },
    { label: 'Urgência', value: ticketPriorityLabel(ticket.priority) },
    { label: 'Máquina', value: ticket.computerName ?? EMPTY },
    { label: 'Responsável', value: ticket.assignee ?? EMPTY },
    { label: 'Aberto em', value: formatReportDate(ticket.createdAt) },
    { label: 'Atendimento iniciado em', value: formatReportDate(ticket.startedAt) },
    { label: 'Resolvido em', value: formatReportDate(ticket.resolvedAt) },
    { label: 'Tempo registrado', value: formatMinutes(totalMinutes(histories)) },
  ];
}

/** A soma do tempo informado nos históricos. Nulo quando ninguém informou tempo nenhum. */
export function totalMinutes(histories: readonly TicketHistory[]): number | null {
  const informed = histories
    .map((history) => history.minutesSpent)
    .filter((minutes) => minutes !== null);
  if (informed.length === 0) return null;

  return informed.reduce((sum, minutes) => sum + minutes, 0);
}

/** "45 min", "2 h", "1 h 30 min" — e um traço quando não há tempo informado. */
export function formatMinutes(minutes: number | null): string {
  if (minutes === null) return EMPTY;
  if (minutes < MINUTES_PER_HOUR) return `${minutes} min`;

  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;

  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** O que este histórico tem de particular, numa linha pequena embaixo do cabeçalho dele. */
function detailsOf(history: TicketHistory): string {
  const details = [`Estágio depois: ${ticketStatusLabel(history.statusAfter)}`];

  if (history.minutesSpent !== null) details.push(`Tempo: ${formatMinutes(history.minutesSpent)}`);
  if (isClosingTicketHistoryType(history.type)) details.push('Encerrou o chamado');
  if (!history.isVisibleToRequester) details.push('Interno — não aparece para quem abriu');

  return details.join('  ·  ');
}
