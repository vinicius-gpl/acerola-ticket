import ExcelJS, { type Cell } from 'exceljs';

import { excelColor, REPORT_PALETTE, REPORT_TONE_SOFT_COLORS } from './report-palette.util';
import { type ReportRequest } from './report.types';

/** O nome da planilha aceita no máximo 31 caracteres — regra do próprio Excel. */
const SHEET_NAME_MAX_LENGTH = 31;

/** Arial Narrow — identidade visual padronizada com os documentos Typst e Word. */
const FONT_NAME = 'Arial Narrow';

const MIN_COLUMN_WIDTH = 14;
const MAX_COLUMN_WIDTH = 46;
const COLUMN_WIDTH_PADDING = 3;
/* Medir toda linha para achar a largura ideal fica caro numa lista de milhares — a amostra
   já cobre o que aparece na tela sem rolagem, que é o caso comum. */
const WIDTH_SAMPLE_SIZE = 200;

const DATA_ROW_HEIGHT = 20;

/* O layout é sempre o mesmo: título, subtítulo, uma linha em branco e o cabeçalho — assim o
   cabeçalho não fica pulando de linha conforme o relatório tem ou não subtítulo. */
const TITLE_ROW = 1;
const SUBTITLE_ROW = 2;
const HEADER_ROW = 4;
const FIRST_DATA_ROW = 5;

/**
 * A ficha em Excel, no mesmo espírito do PDF: título e subtítulo no topo, cabeçalho escuro
 * fixo, listras claras entre as linhas — e SEM grade de bordas cortando tudo, que é o que faz
 * uma planilha comum parecer um formulário impresso em vez de um relatório.
 *
 * A situação de cada linha ganha uma etiqueta clara com texto colorido — a MESMA combinação
 * do `StatusBadge` da tela — em vez de pintar a célula inteira: cor de ponta a ponta da
 * célula lê como erro de formatação, não como destaque.
 */
export async function buildXlsxReport<TRow>(request: ReportRequest<TRow>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(request.title.slice(0, SHEET_NAME_MAX_LENGTH));
  const columnCount = request.columns.length;

  sheet.columns = request.columns.map((column) => ({
    width: columnWidthFor(column, request.rows),
  }));

  writeMergedRow(sheet, TITLE_ROW, columnCount, request.title, {
    bold: true,
    size: 16,
    color: REPORT_PALETTE.primaryForeground,
    fill: REPORT_PALETTE.primary,
    horizontal: 'center',
  });
  sheet.getRow(TITLE_ROW).height = 30;

  if (request.subtitle) {
    writeMergedRow(sheet, SUBTITLE_ROW, columnCount, request.subtitle, {
      italic: true,
      size: 10,
      color: REPORT_PALETTE.subtext,
      horizontal: 'center',
    });
  }

  writeHeaderRow(sheet, request.columns.map((column) => column.header));

  request.rows.forEach((row, index) => {
    const values = request.columns.map((column) => column.value(row));
    const excelRow = sheet.getRow(FIRST_DATA_ROW + index);
    excelRow.values = values;
    excelRow.height = DATA_ROW_HEIGHT;
    const zebraFill = index % 2 === 0 ? REPORT_PALETTE.background : REPORT_PALETTE.surfaceAlt;

    excelRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      const column = request.columns[columnNumber - 1];
      const tone = column?.tone?.(row);
      styleDataCell(cell, tone ? REPORT_TONE_SOFT_COLORS[tone] : null, zebraFill);
    });
  });

  sheet.views = [{ state: 'frozen', ySplit: HEADER_ROW }];

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function clampWidth(width: number): number {
  return Math.min(Math.max(width, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH);
}

/** A largura pelo conteúdo de verdade, não só pelo título da coluna — sem isso "Em atendimento" corta. */
function columnWidthFor<TRow>(
  column: ReportRequest<TRow>['columns'][number],
  rows: TRow[],
): number {
  const longestValue = rows
    .slice(0, WIDTH_SAMPLE_SIZE)
    .reduce((max, row) => Math.max(max, column.value(row).length), 0);

  return clampWidth(Math.max(column.header.length, longestValue) + COLUMN_WIDTH_PADDING);
}

function writeMergedRow(
  sheet: ExcelJS.Worksheet,
  rowIndex: number,
  columnCount: number,
  text: string,
  style: {
    bold?: boolean;
    italic?: boolean;
    size: number;
    color: string;
    fill?: string;
    horizontal?: 'left' | 'center';
  },
): void {
  sheet.mergeCells(rowIndex, 1, rowIndex, columnCount);
  const cell = sheet.getCell(rowIndex, 1);
  cell.value = text;
  cell.font = {
    name: FONT_NAME,
    bold: style.bold,
    italic: style.italic,
    size: style.size,
    color: { argb: excelColor(style.color) },
  };
  cell.alignment = { vertical: 'middle', horizontal: style.horizontal ?? 'left', indent: style.horizontal ? 0 : 1 };
  if (style.fill) {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelColor(style.fill) } };
  }
}

function writeHeaderRow(sheet: ExcelJS.Worksheet, headers: string[]): void {
  const row = sheet.getRow(HEADER_ROW);
  row.values = headers;
  row.height = 22;

  row.eachCell((cell) => {
    cell.font = {
      name: FONT_NAME,
      bold: true,
      size: 11,
      color: { argb: excelColor(REPORT_PALETTE.primaryForeground) },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: excelColor(REPORT_PALETTE.primary) },
    };
    cell.alignment = { vertical: 'middle', indent: 1 };
    /* Só embaixo: é o que separa o cabeçalho do corpo sem desenhar uma grade na lista inteira. */
    cell.border = { bottom: { style: 'medium', color: { argb: excelColor(REPORT_PALETTE.docHeading) } } };
  });
}

function styleDataCell(cell: Cell, tone: { fill: string; text: string } | null, zebraFill: string): void {
  cell.alignment = { vertical: 'middle', horizontal: tone ? 'center' : 'left', indent: tone ? 0 : 1 };
  cell.font = {
    name: FONT_NAME,
    color: { argb: excelColor(tone?.text ?? REPORT_PALETTE.foreground) },
    bold: Boolean(tone),
  };
  cell.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: excelColor(tone?.fill ?? zebraFill) },
  };
  /* Só uma linha fina embaixo, no tom do fundo — dá pra distinguir a linha sem virar uma
     grade que compete com as listras. */
  cell.border = { bottom: { style: 'hair', color: { argb: excelColor(REPORT_PALETTE.surfaceAlt) } } };
}
