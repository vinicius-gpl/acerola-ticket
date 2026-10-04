import PDFDocument from 'pdfkit';

import { pdfColor, REPORT_PALETTE, REPORT_TONE_COLORS } from './report-palette.util';
import { type ReportRequest } from './report.types';

type PdfDoc = InstanceType<typeof PDFDocument>;

const PAGE_MARGIN = 40;
const TITLE_FONT_SIZE = 18;
const SUBTITLE_FONT_SIZE = 9;
const HEADER_FONT_SIZE = 9;
const ROW_FONT_SIZE = 8;
const CELL_PADDING = 4;
const BADGE_PADDING_X = 5;
const BADGE_HEIGHT = 13;

/**
 * O PDF não tem tabela pronta (pdfkit não traz uma): a régua é desenhar linha a linha, na
 * largura disponível da página, e virar página quando não couber mais — sem isso, um parque
 * grande simplesmente sumiria do arquivo depois da primeira página.
 *
 * As cores são as MESMAS da tela: cabeçalho escuro, listras claras entre as linhas, e a
 * situação de cada registro sai como um selo colorido — do mesmo jeito que o `StatusBadge`
 * pinta na tela, não um texto preto igual ao resto.
 */
export async function buildPdfReport<TRow>(request: ReportRequest<TRow>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      layout: 'landscape',
      margin: PAGE_MARGIN,
      bufferPages: true,
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    writeTitle(doc, request.title, request.subtitle);

    const columnWidth = usableWidth(doc) / request.columns.length;
    const headers = request.columns.map((column) => column.header);

    drawHeaderRow(doc, headers, columnWidth);

    request.rows.forEach((row, index) => {
      ensureSpace(doc, headers, columnWidth);
      drawDataRow(doc, request, row, columnWidth, index);
    });

    writePageNumbers(doc);
    doc.end();
  });
}

function usableWidth(doc: PdfDoc): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function writeTitle(doc: PdfDoc, title: string, subtitle: string | undefined): void {
  doc.fontSize(TITLE_FONT_SIZE).font('Helvetica-Bold').fillColor(pdfColor(REPORT_PALETTE.primary));
  doc.text(title);

  if (subtitle) {
    doc
      .fontSize(SUBTITLE_FONT_SIZE)
      .font('Helvetica-Oblique')
      .fillColor(pdfColor(REPORT_PALETTE.subtext))
      .text(subtitle);
  }

  doc.moveDown(0.6);
  doc.fillColor(pdfColor(REPORT_PALETTE.foreground));
}

/**
 * O cabeçalho, do tamanho que o texto pedir.
 *
 * Título de coluna comprido ("Nome técnico") quebra em duas linhas dentro de uma coluna
 * estreita — e uma altura fixa cortava a segunda linha para fora da faixa escura, como se o
 * texto tivesse vazado. Aqui a faixa cresce até caber a coluna mais alta.
 */
function drawHeaderRow(doc: PdfDoc, headers: string[], columnWidth: number): void {
  const left = doc.page.margins.left;
  const top = doc.y;
  const cellWidth = columnWidth - CELL_PADDING * 2;

  doc.font('Helvetica-Bold').fontSize(HEADER_FONT_SIZE);
  const height =
    Math.max(...headers.map((header) => doc.heightOfString(header, { width: cellWidth }))) +
    CELL_PADDING * 2;

  doc.rect(left, top, usableWidth(doc), height).fill(pdfColor(REPORT_PALETTE.foreground));

  doc.fillColor(pdfColor(REPORT_PALETTE.primaryForeground));
  headers.forEach((header, index) => {
    doc.text(header, left + index * columnWidth + CELL_PADDING, top + CELL_PADDING, {
      width: cellWidth,
    });
  });

  doc.y = top + height;
  doc.fillColor(pdfColor(REPORT_PALETTE.foreground));
}

function drawDataRow<TRow>(
  doc: PdfDoc,
  request: ReportRequest<TRow>,
  row: TRow,
  columnWidth: number,
  index: number,
): void {
  const left = doc.page.margins.left;
  const top = doc.y;
  const cellWidth = columnWidth - CELL_PADDING * 2;

  const values = request.columns.map((column) => column.value(row));
  /* A coluna com selo é sempre uma linha só (o texto trunca com reticências em vez de
     quebrar) — medir a altura dela pelo texto inteiro deixaria a linha mais alta do que
     precisa, ou o selo baixo demais para o texto que sobrou depois de cortado. */
  const rowHeight =
    Math.max(
      BADGE_HEIGHT,
      ...request.columns.map((column, columnIndex) =>
        column.tone?.(row) ? 0 : doc.heightOfString(values[columnIndex] ?? '', { width: cellWidth }),
      ),
    ) +
    CELL_PADDING * 2;

  if (index % 2 !== 0) {
    doc.rect(left, top, usableWidth(doc), rowHeight).fill(pdfColor(REPORT_PALETTE.surfaceAlt));
  }

  request.columns.forEach((column, columnIndex) => {
    const value = values[columnIndex] ?? '';
    const x = left + columnIndex * columnWidth + CELL_PADDING;
    const y = top + CELL_PADDING;
    const tone = column.tone?.(row);

    if (tone) {
      drawToneBadge(doc, value, x, y, tone, cellWidth);
    } else {
      doc
        .font('Helvetica')
        .fontSize(ROW_FONT_SIZE)
        .fillColor(pdfColor(REPORT_PALETTE.foreground))
        .text(value, x, y, { width: cellWidth });
    }
  });

  doc.y = top + rowHeight;
}

/**
 * O valor vira um selo colorido, do mesmo jeito que a tela pinta a situação de um registro.
 *
 * O selo é SEMPRE de uma linha: um valor mais comprido que a coluna corta com reticências
 * (`ellipsis`), em vez de quebrar e estourar a altura da etiqueta — foi o que deixava "Boa
 * (100/100)" com o texto espremido, cortado ao meio dentro da etiqueta.
 */
function drawToneBadge(
  doc: PdfDoc,
  value: string,
  x: number,
  y: number,
  tone: keyof typeof REPORT_TONE_COLORS,
  maxWidth: number,
): void {
  const colors = REPORT_TONE_COLORS[tone];
  const availableTextWidth = maxWidth - BADGE_PADDING_X * 2;

  doc.font('Helvetica-Bold').fontSize(ROW_FONT_SIZE);
  const badgeWidth = Math.min(doc.widthOfString(value), availableTextWidth) + BADGE_PADDING_X * 2;

  doc.roundedRect(x, y - 2, badgeWidth, BADGE_HEIGHT, 3).fill(pdfColor(colors.fill));
  doc.fillColor(pdfColor(colors.text)).text(value, x + BADGE_PADDING_X, y, {
    width: availableTextWidth,
    height: BADGE_HEIGHT,
    ellipsis: true,
    lineBreak: false,
  });
}

/** Sem espaço para mais uma linha? Página nova, com o cabeçalho de novo no topo. */
function ensureSpace(doc: PdfDoc, headers: string[], columnWidth: number): void {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y < bottom - ROW_FONT_SIZE * 2) return;

  doc.addPage();
  drawHeaderRow(doc, headers, columnWidth);
}

/**
 * "Página X de Y" — só dá para saber Y depois que o documento inteiro foi desenhado.
 *
 * Escrever DENTRO da margem inferior é o que faz o pdfkit, sozinho, decidir que o texto não
 * cabe e abrir uma página em branco só para o rodapé. Zerar a margem antes de escrever (e
 * devolver o valor depois) é o que evita essa página fantasma.
 */
export function writePageNumbers(doc: PdfDoc): void {
  const range = doc.bufferedPageRange();

  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const originalBottomMargin = doc.page.margins.bottom;
    const y = doc.page.height - originalBottomMargin + 12;

    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(pdfColor(REPORT_PALETTE.subtext))
      .text(`Página ${i - range.start + 1} de ${range.count}`, doc.page.margins.left, y, {
        width: usableWidth(doc),
        align: 'right',
        lineBreak: false,
      });
    doc.page.margins.bottom = originalBottomMargin;
  }
}
