import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  Footer,
  type ISectionOptions,
  Packer,
  PageNumber,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import {
  DOCUMENT_FONT_NAME,
  DOCUMENT_PALETTE,
  DOCUMENT_TONE_COLORS,
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

type DocxChild = Paragraph | Table;
type TableBlock = Extract<DocumentBlock, { kind: 'table' }>;

const FULL_WIDTH_PERCENT = 100;
const LABEL_WIDTH_PERCENT = 28;
const VALUE_WIDTH_PERCENT = 72;
const BADGE_SEPARATOR = '   ·   ';

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: DOCUMENT_PALETTE.background };
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

/**
 * O documento em Word, montado pela biblioteca `docx`: texto de verdade, que a pessoa abre e
 * edita. O rodapé de cada página leva a referência e o número da página.
 *
 * Aqui a cor da situação é texto em negrito, sem sombreamento — um documento de texto pintado
 * de amarelo ou vermelho lê como marca-texto de rascunho, não como documento oficial.
 */
export async function renderDocxDocument(definition: DocumentDefinition): Promise<Buffer> {
  const section: ISectionOptions = {
    properties: { page: { size: { orientation: pageOrientationOf(definition) } } },
    footers: { default: writeFooter(definition.reference) },
    children: [
      ...writeTitle(definition.title, definition.subtitle),
      ...definition.blocks.flatMap(writeBlock),
      ...(definition.verification ? writeVerification(definition.verification) : []),
    ],
  };

  const document = new Document({
    title: definition.title,
    styles: { default: { document: { run: { font: DOCUMENT_FONT_NAME } } } },
    sections: [section],
  });

  return Packer.toBuffer(document);
}

function pageOrientationOf(definition: DocumentDefinition) {
  if (definition.orientation === 'landscape') return PageOrientation.LANDSCAPE;

  return PageOrientation.PORTRAIT;
}

function writeFooter(reference: string): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            children: [`${reference} · Página `, PageNumber.CURRENT, ' de ', PageNumber.TOTAL_PAGES],
            size: 16,
            color: DOCUMENT_PALETTE.subtext,
          }),
        ],
      }),
    ],
  });
}

function writeTitle(title: string, subtitle: string | undefined): Paragraph[] {
  const heading = new Paragraph({
    children: [new TextRun({ text: title, bold: true, size: 40, color: DOCUMENT_PALETTE.primary })],
    spacing: { after: subtitle ? 60 : 240 },
  });
  if (!subtitle) return [heading];

  return [
    heading,
    new Paragraph({
      children: [
        new TextRun({ text: subtitle, italics: true, size: 18, color: DOCUMENT_PALETTE.subtext }),
      ],
      spacing: { after: 240 },
    }),
  ];
}

function writeBlock(block: DocumentBlock): DocxChild[] {
  switch (block.kind) {
    case 'heading':
      return [writeHeading(block.text)];
    case 'paragraph':
      return [new Paragraph({ children: [new TextRun({ text: block.text })], spacing: { after: 120 } })];
    case 'badges':
      return [writeBadges(block.items)];
    case 'fields':
      return [writeFields(block.items)];
    case 'entries':
      return writeEntries(block.items, block.emptyText);
    case 'table':
      return writeRecords(block);
  }
}

function writeHeading(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 280, after: 120 },
    children: [
      new TextRun({ text: text.toUpperCase(), bold: true, size: 20, color: DOCUMENT_PALETTE.primary }),
    ],
  });
}

function writeBadges(badges: DocumentBadge[]): Paragraph {
  return new Paragraph({
    spacing: { after: 160 },
    children: badges.flatMap((badge, index) => [
      ...(index === 0 ? [] : [new TextRun({ text: BADGE_SEPARATOR, color: DOCUMENT_PALETTE.subtext })]),
      writeBadge(badge),
    ]),
  });
}

function writeBadge(badge: DocumentBadge): TextRun {
  return new TextRun({ text: badge.text, bold: true, color: DOCUMENT_TONE_COLORS[badge.tone].fill });
}

function writeFields(fields: DocumentField[]): Table | Paragraph {
  if (fields.length === 0) return new Paragraph({});

  return new Table({
    width: { size: FULL_WIDTH_PERCENT, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: fields.map((field) => writeFieldRow(field.label, { text: field.value })),
  });
}

function writeFieldRow(label: string, value: DocumentCell): TableRow {
  const toneColor = value.tone ? DOCUMENT_TONE_COLORS[value.tone].fill : null;

  return new TableRow({
    children: [
      new TableCell({
        width: { size: LABEL_WIDTH_PERCENT, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: label, bold: true, size: 18, color: DOCUMENT_PALETTE.subtext }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: VALUE_WIDTH_PERCENT, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: value.text,
                bold: Boolean(toneColor),
                color: toneColor ?? DOCUMENT_PALETTE.foreground,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function writeEntries(entries: DocumentEntry[], emptyText: string): Paragraph[] {
  if (entries.length === 0) return [writeEmptyState(emptyText)];

  return entries.flatMap(writeEntry);
}

function writeEntry(entry: DocumentEntry): Paragraph[] {
  const paragraphs = [
    new Paragraph({
      spacing: { before: 200 },
      children: [
        writeBadge(entry.badge),
        new TextRun({ text: `${BADGE_SEPARATOR}${entry.caption}`, bold: true }),
      ],
    }),
    new Paragraph({
      children: [new TextRun({ text: entry.details, size: 16, color: DOCUMENT_PALETTE.subtext })],
    }),
    new Paragraph({ children: [new TextRun({ text: entry.body })] }),
  ];
  if (!entry.note) return paragraphs;

  return [
    ...paragraphs,
    new Paragraph({
      children: [
        new TextRun({ text: entry.note, italics: true, size: 16, color: DOCUMENT_PALETTE.subtext }),
      ],
    }),
  ];
}

/**
 * A tabela NÃO vira uma tabela gigante no Word — numa lista de dezenas de linhas isso rende
 * colunas apertadas e ilegíveis. Cada linha ganha uma FICHA: um título numa faixa colorida e
 * os campos embaixo, como um formulário — mais perto de como se lê um documento de verdade.
 */
function writeRecords(block: TableBlock): DocxChild[] {
  if (block.rows.length === 0) return [writeEmptyState(block.emptyText)];

  return block.rows.flatMap((row, index) => writeRecord(block, row, index));
}

function writeRecord(block: TableBlock, row: DocumentCell[], index: number): DocxChild[] {
  const titleIndex = block.titleColumnIndex;
  const heading = titleIndex === undefined ? undefined : row[titleIndex]?.text;
  /* A coluna do título some da lista de campos — repeti-la seria "CH-0007" na faixa e
     "Protocolo: CH-0007" logo abaixo, dizendo a mesma coisa duas vezes. */
  const fieldRows = block.headers
    .map((header, columnIndex) => ({ header, columnIndex }))
    .filter(({ columnIndex }) => columnIndex !== titleIndex)
    .map(({ header, columnIndex }) => writeFieldRow(header, row[columnIndex] ?? { text: '' }));

  const band = new Paragraph({
    shading: { type: ShadingType.CLEAR, fill: DOCUMENT_PALETTE.primary },
    spacing: { before: index === 0 ? 0 : 320, after: 120 },
    children: [
      new TextRun({
        text: heading ?? `Registro ${index + 1}`,
        bold: true,
        size: 26,
        color: DOCUMENT_PALETTE.primaryForeground,
      }),
    ],
  });
  /* Uma lista em que a única coluna é a do título não tem campo nenhum — e o Word recusa uma
     tabela sem linhas. A ficha fica só com a faixa. */
  if (fieldRows.length === 0) return [band];

  return [
    band,
    new Table({
      width: { size: FULL_WIDTH_PERCENT, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: fieldRows,
    }),
  ];
}

function writeEmptyState(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, italics: true, color: DOCUMENT_PALETTE.subtext })],
  });
}

/** A conferência por extenso: sem QR code, o link clicável (o inteiro) resolve. */
function writeVerification(verification: DocumentVerification): Paragraph[] {
  return [
    writeHeading('Conferência do documento'),
    ...verification.lines.map(
      (line) =>
        new Paragraph({
          children: [new TextRun({ text: line, size: 16, color: DOCUMENT_PALETTE.subtext })],
        }),
    ),
    new Paragraph({
      children: [
        new ExternalHyperlink({
          link: verification.url,
          children: [
            new TextRun({
              text: verification.displayUrl,
              size: 16,
              underline: {},
              color: DOCUMENT_PALETTE.primary,
            }),
          ],
        }),
      ],
    }),
  ];
}
