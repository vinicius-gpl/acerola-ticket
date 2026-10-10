import ExcelJS, { type Cell, type Worksheet } from 'exceljs';

import { BRAND_LOGO, brandLogoWidth } from './document-brand.util';
import {
  DOCUMENT_FONT_NAME,
  DOCUMENT_PALETTE,
  DOCUMENT_TONE_SOFT_COLORS,
  excelColor,
} from './document-palette.util';
import {
  type DocumentBadge,
  type DocumentBlock,
  type DocumentCell,
  type DocumentDefinition,
  type DocumentEntry,
  type DocumentField,
  type DocumentVerification,
} from './document.type';

type TableBlock = Extract<DocumentBlock, { kind: 'table' }>;

/** A folha sendo escrita, e a próxima linha livre — os blocos vão um embaixo do outro. */
type SheetCursor = { sheet: Worksheet; columnCount: number; row: number };

type TextStyle = {
  bold?: boolean;
  italic?: boolean;
  size?: number;
  color?: string;
  fill?: string;
  horizontal?: 'left' | 'center';
  wrapText?: boolean;
};

/** O nome da planilha aceita no máximo 31 caracteres e nenhum destes sinais — regra do Excel. */
const SHEET_NAME_MAX_LENGTH = 31;
const SHEET_NAME_FORBIDDEN = /[\\/?*[\]:]/g;

const MIN_COLUMN_COUNT = 2;
const MIN_COLUMN_WIDTH = 14;
const MAX_COLUMN_WIDTH = 46;
const COLUMN_WIDTH_PADDING = 3;
/* Medir toda linha para achar a largura ideal fica caro numa lista de milhares — a amostra
   já cobre o que aparece na tela sem rolagem, que é o caso comum. */
const WIDTH_SAMPLE_SIZE = 200;
/* Sem tabela para medir, a primeira coluna é a dos rótulos e as outras, a do texto. */
const LABEL_COLUMN_WIDTH = 26;
const TEXT_COLUMN_WIDTH = 40;

const TITLE_ROW_HEIGHT = 48;
/* A logo, em pixels, e o quanto ela se afasta do canto da célula (em fração de célula) — cabe
   dentro da linha do título com uma folga em cima e embaixo. */
const BRAND_LOGO_HEIGHT = 54;
const BRAND_LOGO_OFFSET = 0.08;
const HEADER_ROW_HEIGHT = 22;
const DATA_ROW_HEIGHT = 20;
const TEXT_LINE_HEIGHT = 15;
/* Quantos caracteres cabem numa linha de texto corrido — o Excel não cresce sozinho a altura
   de uma célula mesclada, então a altura é estimada pelo tamanho do texto. */
const TEXT_LINE_LENGTH = 110;

/* O topo é sempre o mesmo: título, subtítulo e uma linha em branco — assim o primeiro bloco
   não fica pulando de linha conforme o documento tem ou não subtítulo. */
const TITLE_ROW = 1;
const SUBTITLE_ROW = 2;
const FIRST_BLOCK_ROW = 4;

/**
 * O documento em Excel, montado pelo ExcelJS: uma planilha só, com o título no topo e os
 * blocos um embaixo do outro. Uma tabela vira linhas de verdade, que a pessoa filtra e soma;
 * o cabeçalho da primeira fica congelado ao rolar.
 *
 * A situação de cada linha ganha uma etiqueta clara com texto colorido — a MESMA combinação
 * do `StatusBadge` da tela — em vez de pintar a célula inteira de cor forte.
 */
export async function renderXlsxDocument(definition: DocumentDefinition): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = definition.createdAt ?? new Date();

  const sheet = workbook.addWorksheet(sheetNameOf(definition.title));
  const cursor: SheetCursor = { sheet, columnCount: columnCountOf(definition), row: FIRST_BLOCK_ROW };

  sheet.columns = columnWidthsOf(definition, cursor.columnCount).map((width) => ({ width }));
  writeTitle(cursor, definition);

  for (const block of definition.blocks) writeBlock(cursor, block);
  if (definition.verification) writeVerification(cursor, definition.verification);

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function sheetNameOf(title: string): string {
  return title.replace(SHEET_NAME_FORBIDDEN, ' ').slice(0, SHEET_NAME_MAX_LENGTH);
}

function firstTableOf(definition: DocumentDefinition): TableBlock | undefined {
  return definition.blocks.find((block) => block.kind === 'table');
}

/** A planilha é tão larga quanto o bloco mais largo: a maior tabela ou a maior fila de selos. */
function columnCountOf(definition: DocumentDefinition): number {
  const widths = definition.blocks.map((block) => {
    if (block.kind === 'table') return block.headers.length;
    if (block.kind === 'badges') return block.items.length;

    return MIN_COLUMN_COUNT;
  });

  return Math.max(MIN_COLUMN_COUNT, ...widths);
}

/** A largura pelo conteúdo de verdade, não só pelo título da coluna — sem isso "Em atendimento" corta. */
function columnWidthsOf(definition: DocumentDefinition, columnCount: number): number[] {
  const table = firstTableOf(definition);

  return Array.from({ length: columnCount }, (_, index) => {
    const header = table?.headers[index];
    if (table && header !== undefined) return measuredWidth(header, table.rows, index);

    return index === 0 ? LABEL_COLUMN_WIDTH : TEXT_COLUMN_WIDTH;
  });
}

function measuredWidth(header: string, rows: DocumentCell[][], columnIndex: number): number {
  const longestValue = rows
    .slice(0, WIDTH_SAMPLE_SIZE)
    .reduce((max, row) => Math.max(max, row[columnIndex]?.text.length ?? 0), 0);
  const width = Math.max(header.length, longestValue) + COLUMN_WIDTH_PADDING;

  return Math.min(Math.max(width, MIN_COLUMN_WIDTH), MAX_COLUMN_WIDTH);
}

/**
 * O topo da planilha: a logo no canto, o título centralizado na cor principal do tema e um fio
 * da mesma cor embaixo — o mesmo cabeçalho do PDF e do Word. O fundo é branco de propósito: a
 * logo é colorida, e sobre uma faixa cheia ela perderia o contorno.
 */
function writeTitle(cursor: SheetCursor, definition: DocumentDefinition): void {
  writeMergedRow(cursor, TITLE_ROW, definition.title, {
    bold: true,
    size: 16,
    color: DOCUMENT_PALETTE.primary,
    horizontal: 'center',
  });
  const titleRow = cursor.sheet.getRow(TITLE_ROW);
  titleRow.height = TITLE_ROW_HEIGHT;
  for (let column = 1; column <= cursor.columnCount; column += 1) {
    titleRow.getCell(column).border = {
      bottom: { style: 'medium', color: { argb: excelColor(DOCUMENT_PALETTE.primary) } },
    };
  }
  writeBrandLogo(cursor);

  if (!definition.subtitle) return;

  writeMergedRow(cursor, SUBTITLE_ROW, definition.subtitle, {
    italic: true,
    size: 10,
    color: DOCUMENT_PALETTE.subtext,
    horizontal: 'center',
  });
}

/** A logo flutua sobre o canto da linha do título — imagem em planilha não mora dentro de célula. */
function writeBrandLogo(cursor: SheetCursor): void {
  /* `Buffer` deste projeto e o `Buffer` que o ExcelJS espera vêm de versões diferentes de
     `@types/node` — o mesmo valor em tempo de execução, o TypeScript é que enxerga dois tipos. */
  const imageId = cursor.sheet.workbook.addImage({
    buffer: BRAND_LOGO as unknown as ExcelJS.Buffer,
    extension: 'png',
  });

  cursor.sheet.addImage(imageId, {
    tl: { col: BRAND_LOGO_OFFSET, row: BRAND_LOGO_OFFSET },
    ext: { width: brandLogoWidth(BRAND_LOGO_HEIGHT), height: BRAND_LOGO_HEIGHT },
    editAs: 'oneCell',
  });
}

function writeBlock(cursor: SheetCursor, block: DocumentBlock): void {
  switch (block.kind) {
    case 'heading':
      return writeHeading(cursor, block.text);
    case 'paragraph':
      return writeText(cursor, block.text, {});
    case 'badges':
      return writeBadges(cursor, block.items);
    case 'fields':
      return block.items.forEach((field) => writeField(cursor, field));
    case 'entries':
      return writeEntries(cursor, block.items, block.emptyText);
    case 'table':
      return writeTable(cursor, block);
  }
}

function writeHeading(cursor: SheetCursor, text: string): void {
  /* Uma linha em branco antes, para o título de seção não colar no bloco de cima. */
  if (cursor.row > FIRST_BLOCK_ROW) cursor.row += 1;

  writeMergedRow(cursor, cursor.row, text.toUpperCase(), {
    bold: true,
    size: 11,
    color: DOCUMENT_PALETTE.primary,
  });
  cursor.row += 1;
}

/** Texto corrido: uma linha mesclada de ponta a ponta, com a altura estimada pelo tamanho. */
function writeText(cursor: SheetCursor, text: string, style: TextStyle): void {
  writeMergedRow(cursor, cursor.row, text, { ...style, wrapText: true });

  const lineCount = text
    .split('\n')
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / TEXT_LINE_LENGTH)), 0);
  cursor.sheet.getRow(cursor.row).height = lineCount * TEXT_LINE_HEIGHT;
  cursor.row += 1;
}

function writeBadges(cursor: SheetCursor, badges: DocumentBadge[]): void {
  badges.forEach((badge, index) => {
    const cell = cursor.sheet.getCell(cursor.row, index + 1);
    cell.value = badge.text;
    styleBadgeCell(cell, badge.tone);
  });
  cursor.sheet.getRow(cursor.row).height = DATA_ROW_HEIGHT;
  cursor.row += 1;
}

function styleBadgeCell(cell: Cell, tone: DocumentBadge['tone']): void {
  const colors = DOCUMENT_TONE_SOFT_COLORS[tone];

  styleCell(cell, { bold: true, color: colors.text, fill: colors.fill, horizontal: 'center' });
}

/** "Rótulo" na primeira coluna e o valor ocupando o resto da largura. */
function writeField(cursor: SheetCursor, field: DocumentField): void {
  const label = cursor.sheet.getCell(cursor.row, 1);
  label.value = field.label;
  styleCell(label, { bold: true, color: DOCUMENT_PALETTE.subtext });

  writeRestOfRow(cursor, field.value, {});
  cursor.row += 1;
}

/** Escreve da segunda coluna até a última, mesclando — o par da célula da primeira coluna. */
function writeRestOfRow(cursor: SheetCursor, text: string, style: TextStyle): void {
  if (cursor.columnCount > MIN_COLUMN_COUNT) {
    cursor.sheet.mergeCells(cursor.row, MIN_COLUMN_COUNT, cursor.row, cursor.columnCount);
  }

  const cell = cursor.sheet.getCell(cursor.row, MIN_COLUMN_COUNT);
  cell.value = text;
  styleCell(cell, style);
}

function writeEntries(cursor: SheetCursor, entries: DocumentEntry[], emptyText: string): void {
  if (entries.length === 0) return writeText(cursor, emptyText, EMPTY_STATE_STYLE);

  entries.forEach((entry) => writeEntry(cursor, entry));
}

function writeEntry(cursor: SheetCursor, entry: DocumentEntry): void {
  const badge = cursor.sheet.getCell(cursor.row, 1);
  badge.value = entry.badge.text;
  styleBadgeCell(badge, entry.badge.tone);
  writeRestOfRow(cursor, entry.caption, { bold: true });
  cursor.row += 1;

  writeText(cursor, entry.details, { size: 9, color: DOCUMENT_PALETTE.subtext });
  writeText(cursor, entry.body, {});
  if (entry.note) writeText(cursor, entry.note, { size: 9, italic: true, color: DOCUMENT_PALETTE.subtext });

  cursor.row += 1;
}

const EMPTY_STATE_STYLE: TextStyle = { italic: true, color: DOCUMENT_PALETTE.subtext };

function writeTable(cursor: SheetCursor, block: TableBlock): void {
  const headerRow = cursor.row;
  writeHeaderRow(cursor, block.headers);

  /* Só o cabeçalho da primeira tabela congela: é o que fica à vista ao rolar a lista. */
  if (cursor.sheet.views.length === 0) cursor.sheet.views = [{ state: 'frozen', ySplit: headerRow }];

  block.rows.forEach((row, index) => writeDataRow(cursor, row, index));
  if (block.rows.length === 0) writeText(cursor, block.emptyText, EMPTY_STATE_STYLE);
}

function writeHeaderRow(cursor: SheetCursor, headers: string[]): void {
  const row = cursor.sheet.getRow(cursor.row);
  row.values = headers;
  row.height = HEADER_ROW_HEIGHT;

  row.eachCell((cell) => {
    styleCell(cell, {
      bold: true,
      size: 11,
      color: DOCUMENT_PALETTE.primaryForeground,
      fill: DOCUMENT_PALETTE.primary,
    });
  });
  cursor.row += 1;
}

function writeDataRow(cursor: SheetCursor, cells: DocumentCell[], index: number): void {
  const row = cursor.sheet.getRow(cursor.row);
  row.values = cells.map((cell) => cell.text);
  row.height = DATA_ROW_HEIGHT;
  const zebraFill = index % 2 === 0 ? DOCUMENT_PALETTE.background : DOCUMENT_PALETTE.surfaceAlt;

  row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
    const tone = cells[columnNumber - 1]?.tone;
    if (tone) return styleBadgeCell(cell, tone);

    styleCell(cell, { fill: zebraFill });
    /* Só uma linha fina embaixo, no tom do fundo — dá para distinguir a linha sem virar uma
       grade que compete com as listras. */
    cell.border = {
      bottom: { style: 'hair', color: { argb: excelColor(DOCUMENT_PALETTE.surfaceAlt) } },
    };
  });
  cursor.row += 1;
}

/** A conferência por extenso: sem QR code, o link clicável (o inteiro) resolve. */
function writeVerification(cursor: SheetCursor, verification: DocumentVerification): void {
  writeHeading(cursor, 'Conferência do documento');
  verification.lines.forEach((line) => {
    writeText(cursor, line, { size: 9, color: DOCUMENT_PALETTE.subtext });
  });

  writeMergedRow(cursor, cursor.row, verification.displayUrl, { color: DOCUMENT_PALETTE.primary });
  cursor.sheet.getCell(cursor.row, 1).value = {
    text: verification.displayUrl,
    hyperlink: verification.url,
  };
  cursor.row += 1;
}

function writeMergedRow(cursor: SheetCursor, rowIndex: number, text: string, style: TextStyle): void {
  cursor.sheet.mergeCells(rowIndex, 1, rowIndex, cursor.columnCount);
  const cell = cursor.sheet.getCell(rowIndex, 1);
  cell.value = text;
  styleCell(cell, style);
}

/** O ÚNICO lugar que decide fonte, cor e alinhamento de uma célula. */
function styleCell(cell: Cell, style: TextStyle): void {
  const isCentered = style.horizontal === 'center';

  cell.font = {
    name: DOCUMENT_FONT_NAME,
    bold: style.bold,
    italic: style.italic,
    size: style.size,
    color: { argb: excelColor(style.color ?? DOCUMENT_PALETTE.foreground) },
  };
  cell.alignment = {
    vertical: 'middle',
    horizontal: style.horizontal ?? 'left',
    indent: isCentered ? 0 : 1,
    wrapText: style.wrapText,
  };
  if (!style.fill) return;

  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: excelColor(style.fill) } };
}
