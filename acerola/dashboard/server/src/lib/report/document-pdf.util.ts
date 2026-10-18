import { join } from 'node:path';

import pdfMake from 'pdfmake';
import {
  type Column,
  type Content,
  type CustomTableLayout,
  type TableCell,
  type TDocumentDefinitions,
} from 'pdfmake/interfaces';

import { BRAND_LOGO_PATH, brandLogoWidth } from './document-brand.util';
import {
  DOCUMENT_PALETTE,
  DOCUMENT_TONE_COLORS,
  DOCUMENT_TONE_SOFT_COLORS,
  pdfColor,
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

/* As fontes moram ao lado deste arquivo — o build do Nest as copia para o `dist` (ver `assets`
   em nest-cli.json), então o mesmo caminho vale em desenvolvimento e em produção. */
const FONTS_DIRECTORY = join(__dirname, 'fonts');
const FONT_FAMILY = 'LiberationSansNarrow';

const PAGE_MARGIN = 36;
/* A4 em pontos (1 pt = 1/72 de polegada), que é a unidade do PDF. */
const A4 = { short: 595.28, long: 841.89 };
const TABLE_FONT_SIZE = 8.5;
const TABLE_CELL_PADDING = 5;
const WEIGHT = { min: 5, textCap: 22 };
/**
 * Quanto ocupa uma letra da Liberation Sans Narrow, em fração do corpo — com folga para o
 * negrito do cabeçalho. É a medida que garante a maior palavra de cada coluna inteira.
 */
const CHARACTER_WIDTH = 0.5;
const FOOTER_HEIGHT = 44;
const BRAND_LOGO_HEIGHT = 46;
const QR_CODE_SIZE = 56;
const FIELDS_PER_ROW = 2;

const COLOR = {
  primary: pdfColor(DOCUMENT_PALETTE.primary),
  primaryForeground: pdfColor(DOCUMENT_PALETTE.primaryForeground),
  foreground: pdfColor(DOCUMENT_PALETTE.foreground),
  subtext: pdfColor(DOCUMENT_PALETTE.subtext),
  border: pdfColor(DOCUMENT_PALETTE.border),
  surfaceAlt: pdfColor(DOCUMENT_PALETTE.surfaceAlt),
} as const;

pdfMake.setFonts({
  [FONT_FAMILY]: {
    normal: join(FONTS_DIRECTORY, 'LiberationSansNarrow-Regular.ttf'),
    bold: join(FONTS_DIRECTORY, 'LiberationSansNarrow-Bold.ttf'),
    italics: join(FONTS_DIRECTORY, 'LiberationSansNarrow-Italic.ttf'),
    bolditalics: join(FONTS_DIRECTORY, 'LiberationSansNarrow-BoldItalic.ttf'),
  },
});
/* O documento nunca busca nada na internet, e do disco só lê o que é dele (fontes e logo):
   um texto vindo de um chamado não consegue fazer o gerador abrir outro arquivo. */
pdfMake.setUrlAccessPolicy(() => false);
pdfMake.setLocalAccessPolicy((path) => path.startsWith(__dirname));

/**
 * O documento em PDF, desenhado pelo pdfmake: A4, logo e título no topo, e um rodapé com a
 * referência e "Página X de Y" em toda página. Quebra de página, cabeçalho de tabela repetido
 * e altura de linha são do pdfmake — aqui só se diz o que vai em cada bloco.
 *
 * O desenho não lê o relógio (a data vem de `createdAt`) nem sorteia nada: a mesma definição
 * dá o mesmo arquivo, byte a byte.
 */
export async function renderPdfDocument(definition: DocumentDefinition): Promise<Buffer> {
  const pdfDefinition: TDocumentDefinitions = {
    pageSize: 'A4',
    pageOrientation: definition.orientation,
    pageMargins: [PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN, PAGE_MARGIN + FOOTER_HEIGHT],
    info: { title: definition.title, creationDate: definition.createdAt ?? new Date() },
    defaultStyle: { font: FONT_FAMILY, fontSize: 9.5, color: COLOR.foreground, lineHeight: 1.15 },
    footer: (currentPage, pageCount) => drawFooter(definition.reference, currentPage, pageCount),
    content: [
      drawHeader(definition),
      ...definition.blocks.map((block) => drawBlock(block, frameWidth(definition.orientation))),
      ...(definition.verification ? [drawVerification(definition.verification)] : []),
    ],
  };

  return pdfMake.createPdf(pdfDefinition).getBuffer();
}

function drawHeader(definition: DocumentDefinition): Content {
  const titleLines: Content[] = [
    { text: definition.title, fontSize: 18, bold: true, color: COLOR.primary },
  ];
  if (definition.subtitle) {
    titleLines.push({ text: definition.subtitle, fontSize: 8.5, color: COLOR.subtext });
  }

  return {
    margin: [0, 0, 0, 12],
    table: {
      widths: ['auto', '*'],
      body: [[drawBrand(), { stack: titleLines, alignment: 'right', margin: [0, 10, 0, 0] }]],
    },
    /* Só o fio de baixo, na cor principal do tema: separa o cabeçalho do corpo. */
    layout: {
      hLineWidth: (index) => (index === 1 ? 1.5 : 0),
      vLineWidth: () => 0,
      hLineColor: () => COLOR.primary,
      paddingLeft: () => 0,
      paddingRight: () => 0,
      paddingBottom: () => 8,
    },
  };
}

/** A assinatura da marca: só a logo, sem nome ao lado. */
function drawBrand(): TableCell {
  return {
    image: BRAND_LOGO_PATH,
    width: brandLogoWidth(BRAND_LOGO_HEIGHT),
    height: BRAND_LOGO_HEIGHT,
  };
}

function drawFooter(reference: string, currentPage: number, pageCount: number): Content {
  return {
    margin: [PAGE_MARGIN, 16, PAGE_MARGIN, 0],
    fontSize: 8,
    color: COLOR.subtext,
    columns: [
      { text: `${reference} · Documento emitido pelo sistema Acerola Ticket` },
      { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', width: 'auto' },
    ],
  };
}

function drawBlock(block: DocumentBlock, frame: number): Content {
  switch (block.kind) {
    case 'heading':
      return drawHeading(block.text);
    case 'paragraph':
      return { text: block.text, margin: [0, 0, 0, 6] };
    case 'badges':
      return { columns: block.items.map(drawBadge), columnGap: 6, margin: [0, 0, 0, 8] };
    case 'fields':
      return drawFields(block.items);
    case 'entries':
      return drawEntries(block.items, block.emptyText);
    case 'table':
      return drawTable(block.headers, block.rows, block.emptyText, frame);
  }
}

function drawHeading(text: string): Content {
  return {
    text: text.toUpperCase(),
    fontSize: 9,
    bold: true,
    color: COLOR.primary,
    characterSpacing: 0.4,
    margin: [0, 10, 0, 5],
  };
}

/** A etiqueta isolada: um retângulo do tamanho do texto, com o fundo suave da situação. */
function drawBadge(badge: DocumentBadge): Column {
  const colors = DOCUMENT_TONE_SOFT_COLORS[badge.tone];

  return {
    width: 'auto',
    table: {
      body: [
        [
          {
            text: badge.text,
            fontSize: 8,
            bold: true,
            color: pdfColor(colors.text),
            fillColor: pdfColor(colors.fill),
            margin: [3, 0, 3, 0],
          },
        ],
      ],
    },
    layout: 'noBorders',
  };
}

/** Os pares "rótulo: valor" em duas colunas, como um formulário preenchido. */
function drawFields(fields: DocumentField[]): Content {
  const rows: TableCell[][] = [];

  for (let index = 0; index < fields.length; index += FIELDS_PER_ROW) {
    rows.push(fields.slice(index, index + FIELDS_PER_ROW).flatMap(drawField));
  }

  /* Um campo sozinho na última linha: completa com células vazias, senão a tabela não fecha. */
  const lastRow = rows.at(-1);
  if (lastRow && lastRow.length < FIELDS_PER_ROW * 2) lastRow.push({}, {});
  if (rows.length === 0) return { text: '' };

  return {
    margin: [0, 0, 0, 6],
    table: { widths: ['auto', '*', 'auto', '*'], body: rows },
    layout: {
      hLineWidth: (index) => (index === 0 ? 0 : 0.5),
      vLineWidth: () => 0,
      hLineColor: () => COLOR.border,
      paddingLeft: () => 0,
      paddingRight: () => 10,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
  };
}

function drawField(field: DocumentField): TableCell[] {
  return [
    { text: field.label, fontSize: 8, bold: true, color: COLOR.subtext },
    { text: field.value },
  ];
}

function drawEntries(entries: DocumentEntry[], emptyText: string): Content {
  if (entries.length === 0) return drawEmptyState(emptyText);

  return { stack: entries.map(drawEntry) };
}

/** Um passo da linha do tempo, com uma barra da cor da situação na lateral. */
function drawEntry(entry: DocumentEntry): Content {
  const lines: Content[] = [
    {
      columns: [
        drawBadge(entry.badge),
        { text: entry.caption, fontSize: 8.5, bold: true, margin: [0, 1, 0, 0] },
      ],
      columnGap: 6,
    },
    { text: entry.details, fontSize: 7.5, color: COLOR.subtext, margin: [0, 2, 0, 2] },
    { text: entry.body },
  ];
  if (entry.note) {
    lines.push({
      text: entry.note,
      fontSize: 8,
      italics: true,
      color: COLOR.subtext,
      margin: [0, 2, 0, 0],
    });
  }

  const barColor = pdfColor(DOCUMENT_TONE_COLORS[entry.badge.tone].fill);

  return {
    margin: [0, 0, 0, 8],
    table: { widths: ['*'], body: [[{ stack: lines }]] },
    layout: {
      hLineWidth: () => 0,
      vLineWidth: (index) => (index === 0 ? 2 : 0),
      vLineColor: () => barColor,
      paddingLeft: () => 8,
      paddingRight: () => 0,
      paddingTop: () => 1,
      paddingBottom: () => 1,
    },
  };
}

/* Cabeçalho escuro, listras claras e só linhas horizontais finas — sem grade, que é o que faz
   uma lista parecer um formulário impresso em vez de um relatório. */
const TABLE_LAYOUT: CustomTableLayout = {
  hLineWidth: (index) => (index <= 1 ? 0 : 0.5),
  vLineWidth: () => 0,
  hLineColor: () => COLOR.border,
  fillColor: (rowIndex) => (rowIndex > 0 && rowIndex % 2 === 0 ? COLOR.surfaceAlt : null),
  paddingLeft: () => TABLE_CELL_PADDING,
  paddingRight: () => TABLE_CELL_PADDING,
  paddingTop: () => 4,
  paddingBottom: () => 4,
};

function drawTable(
  headers: string[],
  rows: DocumentCell[][],
  emptyText: string,
  frame: number,
): Content {
  const table: Content = {
    fontSize: TABLE_FONT_SIZE,
    table: {
      /* O cabeçalho se repete em toda página, e uma linha nunca é cortada ao meio. */
      headerRows: 1,
      dontBreakRows: true,
      widths: columnWidths(headers, rows, frame),
      body: [headers.map(drawHeaderCell), ...rows.map((row) => row.map(drawCell))],
    },
    layout: TABLE_LAYOUT,
  };
  if (rows.length > 0) return table;

  return { stack: [table, drawEmptyState(emptyText)] };
}

/** A largura útil da folha, entre as margens. */
function frameWidth(orientation: DocumentDefinition['orientation']): number {
  const width = orientation === 'landscape' ? A4.long : A4.short;

  return width - PAGE_MARGIN * 2;
}

/**
 * Cada coluna recebe PRIMEIRO o espaço da maior palavra dela — coluna mais estreita que uma
 * palavra a parte no meio ("Protoc-olo"), e data quebrada em duas linhas não se lê. O que sobra
 * da folha é dividido pelo que cada coluna ainda carrega além disso: a de nomes fica larga, a de
 * datas, estreita.
 */
export function columnWidths(headers: string[], rows: DocumentCell[][], frame: number): number[] {
  const measures = headers.map((header, index) => {
    const texts = [header, ...rows.map((row) => row[index]?.text ?? '')];
    const longestText = Math.max(...texts.map((text) => text.length));
    const longestWord = Math.max(
      WEIGHT.min,
      ...texts.flatMap((text) => text.split(/\s+/)).map((word) => word.length),
    );

    return {
      word: longestWord,
      extra: Math.max(0, Math.min(longestText, WEIGHT.textCap) - longestWord),
    };
  });
  /* O que sobra para o texto, descontado o respiro de cada coluna. */
  const columns = headers.length;
  const available = frame - columns * TABLE_CELL_PADDING * 2;
  const words = measures.map((measure) => measure.word * TABLE_FONT_SIZE * CHARACTER_WIDTH);
  const wordsTotal = words.reduce((sum, width) => sum + width, 0);
  /* Nem as palavras cabem: divide a folha na proporção delas, o melhor que dá. */
  if (wordsTotal >= available) return words.map((width) => (available * width) / wordsTotal);

  const extraTotal = measures.reduce((sum, measure) => sum + measure.extra, 0);
  const spare = available - wordsTotal;

  return words.map((width, index) => {
    const extra = measures[index]?.extra ?? 0;

    return width + (extraTotal === 0 ? spare / columns : (spare * extra) / extraTotal);
  });
}

function drawHeaderCell(header: string): TableCell {
  return { text: header, bold: true, color: COLOR.primaryForeground, fillColor: COLOR.primary };
}

function drawCell(cell: DocumentCell): TableCell {
  if (!cell.tone) return { text: cell.text };

  return {
    text: cell.text,
    bold: true,
    color: pdfColor(DOCUMENT_TONE_SOFT_COLORS[cell.tone].text),
  };
}

function drawEmptyState(text: string): Content {
  return { text, italics: true, color: COLOR.subtext, margin: [0, 6, 0, 6] };
}

/**
 * A conferência, no fim do documento: o QR code leva o link CURTO (o inteiro ficaria miúdo
 * demais para a câmera ler) e o texto ao lado é clicável com o link INTEIRO.
 */
function drawVerification(verification: DocumentVerification): Content {
  return {
    unbreakable: true,
    margin: [0, 14, 0, 0],
    table: {
      widths: [QR_CODE_SIZE, '*'],
      body: [
        [
          { qr: verification.displayUrl, fit: QR_CODE_SIZE, eccLevel: 'M' },
          {
            fontSize: 8,
            color: COLOR.subtext,
            margin: [6, 0, 0, 0],
            stack: [
              { text: 'Conferência do documento', bold: true, color: COLOR.foreground },
              ...verification.lines,
              {
                text: verification.displayUrl,
                link: verification.url,
                color: COLOR.primary,
                decoration: 'underline',
              },
            ],
          },
        ],
      ],
    },
    layout: {
      hLineWidth: (index) => (index === 0 ? 0.5 : 0),
      vLineWidth: () => 0,
      hLineColor: () => COLOR.border,
      paddingLeft: () => 0,
      paddingTop: () => 8,
    },
  };
}
