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
import {
  serviceOrderVerifyPath,
  shortServiceOrderCode,
} from '@template/shared/domain/service-order.util';
import { type TicketHistory } from '@template/shared/schemas/ticket-history.schema';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';

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

const PAGE_MARGIN = 44;
/** A margem de baixo é maior que as outras: é onde mora o rodapé de conferência. */
const FOOTER_MARGIN = 84;
const FOOTER_TOP_GAP = 14;
const QR_SIZE = 52;
const QR_GAP = 10;
/** A largura reservada, à direita, para o "Página X de Y". */
const PAGE_NUMBER_WIDTH = 80;
const FOOTER_LINE_HEIGHT = 11;
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
export async function buildServiceOrderPdf(
  order: ServiceOrder,
  issue: ServiceOrderIssue,
): Promise<Buffer> {
  /* O QR code leva o código CURTO: com o inteiro ele ficaria miúdo demais para a câmera ler
     num rodapé. É só para o papel impresso — na tela, o link (com o código inteiro) resolve. */
  const qrCode = await QRCode.toBuffer(verifyUrl(issue, shortServiceOrderCode(issue.code)), {
    margin: 0,
    scale: 4,
    errorCorrectionLevel: 'M',
  });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: PAGE_MARGIN, left: PAGE_MARGIN, right: PAGE_MARGIN, bottom: FOOTER_MARGIN },
      bufferPages: true,
      /* A data de criação do ARQUIVO é a da emissão, e não a de agora: o pdfkit a escreve
         dentro do arquivo, e com a hora de agora cada geração sairia diferente da anterior. */
      info: { Title: `Ordem de serviço ${order.protocol}`, CreationDate: issue.issuedAt },
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    writeHeader(doc, order, issue);
    writeFields(doc, fieldsOf(order));
    writeBlock(doc, 'Descrição do problema', order.ticket.description);
    if (order.ticket.solution) writeBlock(doc, 'O que foi feito', order.ticket.solution);
    writeTimeline(doc, order.histories);

    writeVerificationFooter(doc, order, issue, qrCode);
    writePageNumbers(doc);
    doc.end();
  });
}

function verifyUrl(issue: ServiceOrderIssue, reference: string): string {
  return `${issue.webOrigin}${serviceOrderVerifyPath(reference)}`;
}

/**
 * O RODAPÉ DE CONFERÊNCIA, em TODAS as páginas: uma folha solta também precisa dizer de onde
 * veio e como conferir.
 *
 * O que vai impresso é o CÓDIGO da emissão, e não a impressão digital do arquivo: escrever a
 * impressão digital dentro do arquivo mudaria o próprio arquivo — e, com ele, ela.
 *
 * Zerar a margem de baixo antes de escrever é o mesmo cuidado do `writePageNumbers`: sem isso
 * o pdfkit decide que o texto não cabe e abre uma página em branco só para o rodapé.
 */
function writeVerificationFooter(
  doc: PdfDoc,
  order: ServiceOrder,
  issue: ServiceOrderIssue,
  qrCode: Buffer,
): void {
  const range = doc.bufferedPageRange();
  const shortCode = shortServiceOrderCode(issue.code);
  const lines = [
    `Emitida em ${formatReportDate(issue.issuedAt)} por ${issue.issuedByName}`,
    `Código de verificação: ${shortCode}`,
  ];

  for (let page = range.start; page < range.start + range.count; page += 1) {
    doc.switchToPage(page);

    const left = doc.page.margins.left;
    const top = doc.page.height - FOOTER_MARGIN + FOOTER_TOP_GAP;
    const textLeft = left + QR_SIZE + QR_GAP;
    const textWidth = usableWidth(doc) - QR_SIZE - QR_GAP - PAGE_NUMBER_WIDTH;
    const originalBottomMargin = doc.page.margins.bottom;

    doc.page.margins.bottom = 0;

    doc
      .moveTo(left, top - 6)
      .lineTo(left + usableWidth(doc), top - 6)
      .lineWidth(0.6)
      .strokeColor(pdfColor(REPORT_PALETTE.border))
      .stroke();

    doc.image(qrCode, left, top, { width: QR_SIZE, height: QR_SIZE });

    doc
      .font('Helvetica-Bold')
      .fontSize(SMALL_SIZE)
      .fillColor(pdfColor(REPORT_PALETTE.foreground))
      .text(`Ordem de serviço ${order.protocol} · versão ${issue.version}`, textLeft, top, {
        width: textWidth,
        lineBreak: false,
      });

    doc.font('Helvetica').fillColor(pdfColor(REPORT_PALETTE.subtext));
    lines.forEach((line, index) => {
      doc.text(line, textLeft, top + (index + 1) * FOOTER_LINE_HEIGHT, {
        width: textWidth,
        lineBreak: false,
      });
    });

    /* O texto mostra o endereço curto; o clique leva ao código inteiro. */
    doc
      .fillColor(pdfColor(REPORT_PALETTE.primary))
      .text(`Confira em ${verifyUrl(issue, shortCode)}`, textLeft, top + 3 * FOOTER_LINE_HEIGHT, {
        width: textWidth,
        lineBreak: false,
        link: verifyUrl(issue, issue.code),
      });

    doc.page.margins.bottom = originalBottomMargin;
  }
}

function usableWidth(doc: PdfDoc): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function writeHeader(doc: PdfDoc, order: ServiceOrder, issue: ServiceOrderIssue): void {
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
    .text(`Versão ${issue.version} · emitida em ${formatReportDate(issue.issuedAt)}`);

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
