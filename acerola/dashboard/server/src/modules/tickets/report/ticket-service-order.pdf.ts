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
  ticketStatusLabel,
  ticketStatusTone,
} from '@template/shared/domain/ticket-status.util';
import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
import PDFDocument from 'pdfkit';

import {
  pdfColor,
  REPORT_PALETTE,
  REPORT_TONE_COLORS,
} from '../../../lib/report/report-palette.util';
import { writePageNumbers } from '../../../lib/report/report-pdf.builder';
import { type ReportTone } from '../../../lib/report/report.types';
import { formatReportDate } from '../../../lib/report/report.util';
import { type TicketWithComputer } from '../repository/tickets.repository';

type PdfDoc = InstanceType<typeof PDFDocument>;

export type ServiceOrder = {
  ticket: TicketWithComputer;
  protocol: string;
  histories: readonly TicketHistory[];
};

const PAGE_MARGIN = 44;
const TITLE_SIZE = 18;
const SECTION_SIZE = 11;
const BODY_SIZE = 9.5;
const SMALL_SIZE = 8;
const BADGE_HEIGHT = 14;
const BADGE_PADDING_X = 6;
const FIELD_GAP = 12;
const MINUTES_PER_HOUR = 60;
const EMPTY = '—';

/**
 * A ORDEM DE SERVIÇO de um chamado, em PDF: os dados dele e a linha do tempo inteira.
 *
 * É um documento, não uma lista — por isso não passa pelo `buildReport`, que desenha tabela.
 * É o papel que se imprime, se anexa a um processo ou se manda para quem pediu a prova de que
 * o chamado foi atendido: precisa se explicar sozinho, sem o sistema por perto.
 *
 * O texto corre em fluxo (sem posição fixa) de propósito: é o pdfkit que vira a página quando
 * um histórico comprido não cabe, e nenhum chamado some do arquivo por ter história demais.
 */
export async function buildServiceOrderPdf(order: ServiceOrder): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: PAGE_MARGIN, bufferPages: true });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    writeHeader(doc, order);
    writeFields(doc, fieldsOf(order));
    writeBlock(doc, 'Descrição do problema', order.ticket.description);
    if (order.ticket.solution) writeBlock(doc, 'O que foi feito', order.ticket.solution);
    writeTimeline(doc, order.histories);

    writePageNumbers(doc);
    doc.end();
  });
}

function usableWidth(doc: PdfDoc): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function writeHeader(doc: PdfDoc, order: ServiceOrder): void {
  const top = doc.y;

  doc
    .font('Helvetica-Bold')
    .fontSize(TITLE_SIZE)
    .fillColor(pdfColor(REPORT_PALETTE.primary))
    .text(`Ordem de serviço ${order.protocol}`);

  doc
    .font('Helvetica-Oblique')
    .fontSize(SMALL_SIZE)
    .fillColor(pdfColor(REPORT_PALETTE.subtext))
    .text(`Gerada em ${formatReportDate(new Date())}`);

  /* O estágio atual no canto, como selo: é a primeira coisa que quem pega o papel quer saber. */
  const after = doc.y;
  const label = ticketStatusLabel(order.ticket.status);
  doc.font('Helvetica-Bold').fontSize(BODY_SIZE);
  const width = doc.widthOfString(label) + BADGE_PADDING_X * 2;
  drawBadge(
    doc,
    label,
    doc.page.width - doc.page.margins.right - width,
    top + 4,
    ticketStatusTone(order.ticket.status),
  );

  doc.y = after;
  doc.moveDown(0.8);
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

/** Os dados do chamado em duas colunas: rótulo pequeno em cima, valor embaixo. */
function writeFields(doc: PdfDoc, fields: Field[]): void {
  writeSectionTitle(doc, 'Dados do chamado');

  const left = doc.page.margins.left;
  const columnWidth = (usableWidth(doc) - FIELD_GAP) / 2;

  for (let index = 0; index < fields.length; index += 2) {
    const top = doc.y;
    const pair = [fields[index], fields[index + 1]];
    let bottom = top;

    pair.forEach((field, column) => {
      if (!field) return;

      const x = left + column * (columnWidth + FIELD_GAP);
      doc
        .font('Helvetica')
        .fontSize(SMALL_SIZE)
        .fillColor(pdfColor(REPORT_PALETTE.subtext))
        .text(field.label, x, top, { width: columnWidth });
      doc
        .font('Helvetica-Bold')
        .fontSize(BODY_SIZE)
        .fillColor(pdfColor(REPORT_PALETTE.foreground))
        .text(field.value, x, doc.y, { width: columnWidth });

      bottom = Math.max(bottom, doc.y);
    });

    doc.y = bottom + 6;
  }

  doc.x = left;
  doc.moveDown(0.4);
}

function writeSectionTitle(doc: PdfDoc, title: string): void {
  const left = doc.page.margins.left;

  doc
    .font('Helvetica-Bold')
    .fontSize(SECTION_SIZE)
    .fillColor(pdfColor(REPORT_PALETTE.foreground))
    .text(title, left, doc.y, { width: usableWidth(doc) });

  const y = doc.y + 2;
  doc
    .moveTo(left, y)
    .lineTo(left + usableWidth(doc), y)
    .lineWidth(0.6)
    .strokeColor(pdfColor(REPORT_PALETTE.border))
    .stroke();

  doc.y = y + 8;
}

function writeBlock(doc: PdfDoc, title: string, text: string): void {
  writeSectionTitle(doc, title);

  doc
    .font('Helvetica')
    .fontSize(BODY_SIZE)
    .fillColor(pdfColor(REPORT_PALETTE.foreground))
    .text(text, doc.page.margins.left, doc.y, { width: usableWidth(doc) });

  doc.moveDown(1);
}

function writeTimeline(doc: PdfDoc, histories: readonly TicketHistory[]): void {
  writeSectionTitle(doc, 'Histórico');

  if (histories.length === 0) {
    doc
      .font('Helvetica-Oblique')
      .fontSize(BODY_SIZE)
      .fillColor(pdfColor(REPORT_PALETTE.subtext))
      .text('Nenhum histórico registrado.');

    return;
  }

  histories.forEach((history) => writeHistory(doc, history));
}

/** O que este histórico tem de particular, numa linha pequena embaixo do cabeçalho dele. */
function detailsOf(history: TicketHistory): string {
  const details = [`Estágio depois: ${ticketStatusLabel(history.statusAfter)}`];

  if (history.minutesSpent !== null) details.push(`Tempo: ${formatMinutes(history.minutesSpent)}`);
  if (isClosingTicketHistoryType(history.type)) details.push('Encerrou o chamado');
  if (!history.isVisibleToRequester) details.push('Interno — não aparece para quem abriu');

  return details.join('  ·  ');
}

function writeHistory(doc: PdfDoc, history: TicketHistory): void {
  const left = doc.page.margins.left;
  const width = usableWidth(doc);

  /* Um histórico não começa no pé da página para continuar na outra: o cabeçalho dele (data,
     tipo, autor) ficaria separado do texto que explica. */
  if (doc.y > doc.page.height - doc.page.margins.bottom - 60) doc.addPage();

  const top = doc.y;
  const label = ticketHistoryTypeLabel(history.type);
  doc.font('Helvetica-Bold').fontSize(SMALL_SIZE);
  const badgeWidth = doc.widthOfString(label) + BADGE_PADDING_X * 2;
  drawBadge(doc, label, left, top, ticketHistoryTone(history.type), SMALL_SIZE);

  doc
    .font('Helvetica-Bold')
    .fontSize(BODY_SIZE)
    .fillColor(pdfColor(REPORT_PALETTE.foreground))
    .text(
      `${formatReportDate(new Date(history.createdAt))}  ·  ${history.authorName}`,
      left + badgeWidth + 8,
      top + 2,
      { width: width - badgeWidth - 8 },
    );

  doc.y = Math.max(doc.y, top + BADGE_HEIGHT) + 3;
  doc
    .font('Helvetica')
    .fontSize(SMALL_SIZE)
    .fillColor(pdfColor(REPORT_PALETTE.subtext))
    .text(detailsOf(history), left, doc.y, { width });

  doc.moveDown(0.3);
  doc
    .font('Helvetica')
    .fontSize(BODY_SIZE)
    .fillColor(pdfColor(REPORT_PALETTE.foreground))
    .text(history.description, left, doc.y, { width });

  if (history.attachments.length > 0) {
    const names = history.attachments.map((attachment) => attachment.fileName).join(', ');

    doc.moveDown(0.2);
    doc
      .font('Helvetica-Oblique')
      .fontSize(SMALL_SIZE)
      .fillColor(pdfColor(REPORT_PALETTE.subtext))
      .text(`Anexos: ${names}`, left, doc.y, { width });
  }

  doc.moveDown(0.9);
}

function drawBadge(
  doc: PdfDoc,
  label: string,
  x: number,
  y: number,
  tone: ReportTone,
  fontSize: number = BODY_SIZE,
): void {
  const colors = REPORT_TONE_COLORS[tone];

  doc.font('Helvetica-Bold').fontSize(fontSize);
  const width = doc.widthOfString(label) + BADGE_PADDING_X * 2;

  doc.roundedRect(x, y, width, BADGE_HEIGHT, 3).fill(pdfColor(colors.fill));
  doc
    .fillColor(pdfColor(colors.text))
    .text(label, x + BADGE_PADDING_X, y + (BADGE_HEIGHT - fontSize) / 2, { lineBreak: false });
}
