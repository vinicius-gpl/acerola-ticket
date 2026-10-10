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

import { renderPdfDocument } from '../../../lib/report/document-pdf.util';
import {
  type DocumentBlock,
  type DocumentDefinition,
  type DocumentEntry,
  type DocumentField,
} from '../../../lib/report/document.type';
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
 * A ORDEM DE SERVIÇO de um chamado em PDF: os dados dele e a linha do tempo inteira.
 *
 * O que o documento diz está em `serviceOrderDocument`; quem desenha é o mesmo gerador de PDF
 * de todos os documentos do sistema.
 */
export async function buildServiceOrderPdf(
  order: ServiceOrder,
  issue: ServiceOrderIssue,
): Promise<Buffer> {
  return renderPdfDocument(serviceOrderDocument(order, issue));
}

/** A definição da ordem de serviço: os blocos, na ordem em que a pessoa lê. */
function serviceOrderDocument(
  order: ServiceOrder,
  issue: ServiceOrderIssue,
): DocumentDefinition {
  const { ticket } = order;
  const shortCode = shortServiceOrderCode(issue.code);

  return {
    title: `Ordem de serviço nº ${order.protocol}`,
    subtitle: 'Comprovante técnico de atendimento',
    reference: `Ordem de serviço ${order.protocol} · Versão ${issue.version}`,
    orientation: 'portrait',
    /* A data gravada no arquivo é a da emissão, nunca a de agora — senão o mesmo documento
       desenhado amanhã sairia diferente, e a conferência deixaria de conferir. */
    createdAt: issue.issuedAt,
    blocks: [
      {
        kind: 'badges',
        items: [
          { text: ticketStatusLabel(ticket.status), tone: ticketStatusTone(ticket.status) },
          { text: ticketPriorityLabel(ticket.priority), tone: ticketPriorityTone(ticket.priority) },
        ],
      },
      { kind: 'fields', items: fieldsOf(order) },
      { kind: 'heading', text: 'Descrição do problema' },
      { kind: 'paragraph', text: ticket.description },
      ...solutionBlocksOf(ticket),
      { kind: 'heading', text: 'Linha do tempo' },
      {
        kind: 'entries',
        items: order.histories.map(entryOf),
        emptyText: 'Nenhum histórico registrado neste chamado.',
      },
    ],
    verification: {
      url: verifyUrl(issue, issue.code),
      /* O QR code leva o código CURTO: com o inteiro ele ficaria miúdo demais para a câmera
         ler. É só para o papel impresso — na tela, o link (com o código inteiro) resolve. */
      displayUrl: verifyUrl(issue, shortCode),
      lines: [
        `Emitida em ${formatReportDate(issue.issuedAt)} por ${issue.issuedByName}`,
        `Código de verificação: ${shortCode}`,
      ],
    },
  };
}

/** A solução só aparece quando alguém a escreveu — um título sem texto embaixo confunde. */
function solutionBlocksOf(ticket: TicketWithComputer): DocumentBlock[] {
  if (!ticket.solution) return [];

  return [
    { kind: 'heading', text: 'Solução' },
    { kind: 'paragraph', text: ticket.solution },
  ];
}

function entryOf(history: TicketHistory): DocumentEntry {
  const attachments = history.attachments.map((attachment) => attachment.fileName).join(', ');

  return {
    badge: { text: ticketHistoryTypeLabel(history.type), tone: ticketHistoryTone(history.type) },
    caption: `${history.authorName} · ${formatReportDate(new Date(history.createdAt))}`,
    details: detailsOf(history),
    body: history.description,
    note: attachments ? `Anexos: ${attachments}` : undefined,
  };
}

function verifyUrl(issue: ServiceOrderIssue, reference: string): string {
  return `${issue.webOrigin}${serviceOrderVerifyPath(reference)}`;
}

function fieldsOf({ ticket, histories }: ServiceOrder): DocumentField[] {
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
