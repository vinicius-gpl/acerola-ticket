import PDFDocument from 'pdfkit';

import { type ReportRequest } from './report.types';

type PdfDoc = InstanceType<typeof PDFDocument>;

const PAGE_MARGIN = 40;
const HEADER_FONT_SIZE = 9;
const ROW_FONT_SIZE = 8;
const CELL_PADDING = 4;

/**
 * O PDF não tem tabela pronta (pdfkit não traz uma): a régua é desenhar linha a linha, na
 * largura disponível da página, e virar página quando não couber mais — sem isso, um parque
 * grande simplesmente sumiria do arquivo depois da primeira página.
 */
export async function buildPdfReport<TRow>(request: ReportRequest<TRow>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: PAGE_MARGIN });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).font('Helvetica-Bold').text(request.title);
    doc.moveDown();

    const columnWidth = usableWidth(doc) / request.columns.length;
    const headers = request.columns.map((column) => column.header);

    drawRow(doc, headers, columnWidth, HEADER_FONT_SIZE, true);

    for (const row of request.rows) {
      ensureSpace(doc, headers, columnWidth);
      const values = request.columns.map((column) => column.value(row));
      drawRow(doc, values, columnWidth, ROW_FONT_SIZE, false);
    }

    doc.end();
  });
}

function usableWidth(doc: PdfDoc): number {
  return doc.page.width - doc.page.margins.left - doc.page.margins.right;
}

function drawRow(
  doc: PdfDoc,
  values: string[],
  columnWidth: number,
  fontSize: number,
  isHeader: boolean,
): void {
  const left = doc.page.margins.left;
  const top = doc.y;
  doc.font(isHeader ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);

  const cellWidth = columnWidth - CELL_PADDING;
  const rowHeight =
    Math.max(...values.map((value) => doc.heightOfString(value, { width: cellWidth }))) +
    CELL_PADDING;

  values.forEach((value, index) => {
    doc.text(value, left + index * columnWidth, top, { width: cellWidth });
  });

  doc.y = top + rowHeight;
  if (isHeader) doc.moveDown(0.3);
}

/** Sem espaço para mais uma linha? Página nova, com o cabeçalho de novo no topo. */
function ensureSpace(doc: PdfDoc, headers: string[], columnWidth: number): void {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (doc.y < bottom - ROW_FONT_SIZE * 2) return;

  doc.addPage();
  drawRow(doc, headers, columnWidth, HEADER_FONT_SIZE, true);
}
