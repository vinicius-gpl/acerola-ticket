import {
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import { REPORT_PALETTE, REPORT_TONE_COLORS } from './report-palette.util';
import { type ReportColumn, type ReportRequest } from './report.types';

const FULL_WIDTH_PERCENT = 100;
const LABEL_WIDTH_PERCENT = 28;
const VALUE_WIDTH_PERCENT = 72;

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

/**
 * O Word não vira uma tabela gigante — numa lista de dezenas de chamados isso rendia colunas
 * apertadas e ilegíveis. Em vez disso, cada registro ganha uma FICHA: um título colorido e os
 * campos embaixo, como um formulário — mais perto de como se lê um documento de verdade.
 */
export async function buildDocxReport<TRow>(request: ReportRequest<TRow>): Promise<Buffer> {
  const titleColumn = request.columns.find((column) => column.isTitle);
  const fieldColumns = request.columns.filter((column) => !column.isTitle);

  const document = new Document({
    sections: [
      {
        children: [
          ...writeTitle(request.title, request.subtitle),
          ...request.rows.flatMap((row, index) => writeRecord(row, index, titleColumn, fieldColumns)),
          ...(request.rows.length === 0 ? [writeEmptyState()] : []),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}

function writeTitle(title: string, subtitle: string | undefined): Paragraph[] {
  const paragraphs = [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 40, color: REPORT_PALETTE.docHeading })],
      spacing: { after: subtitle ? 60 : 240 },
    }),
  ];

  if (subtitle) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: subtitle, italics: true, size: 18, color: REPORT_PALETTE.subtext }),
        ],
        spacing: { after: 240 },
      }),
    );
  }

  return paragraphs;
}

function writeEmptyState(): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: 'Nenhum registro encontrado com esse filtro.', italics: true, color: REPORT_PALETTE.subtext }),
    ],
  });
}

function writeRecord<TRow>(
  row: TRow,
  index: number,
  titleColumn: ReportColumn<TRow> | undefined,
  fieldColumns: ReportColumn<TRow>[],
): (Paragraph | Table)[] {
  const heading = titleColumn ? titleColumn.value(row) : `Registro ${index + 1}`;

  return [
    new Paragraph({
      shading: { type: ShadingType.CLEAR, fill: REPORT_PALETTE.docHeading },
      spacing: { before: index === 0 ? 0 : 320, after: 120 },
      children: [
        new TextRun({ text: heading, bold: true, size: 26, color: REPORT_PALETTE.primaryForeground }),
      ],
    }),
    new Table({
      width: { size: FULL_WIDTH_PERCENT, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: fieldColumns.map((column) => writeFieldRow(column, row)),
    }),
  ];
}

/**
 * O campo colorido é texto em negrito, sem sombreamento de célula — um documento de texto
 * pintado de amarelo/vermelho lê como marca-texto de rascunho, não como relatório oficial. A
 * cor sozinha já chama a atenção sem parecer um destaque de caneta.
 */
function writeFieldRow<TRow>(column: ReportColumn<TRow>, row: TRow): TableRow {
  const value = column.value(row);
  const tone = column.tone?.(row);
  const toneColor = tone ? REPORT_TONE_COLORS[tone].fill : null;

  return new TableRow({
    children: [
      new TableCell({
        width: { size: LABEL_WIDTH_PERCENT, type: WidthType.PERCENTAGE },
        borders: NO_BORDERS,
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: column.header, bold: true, size: 18, color: REPORT_PALETTE.subtext }),
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
                text: value,
                bold: Boolean(toneColor),
                color: toneColor ?? REPORT_PALETTE.foreground,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
