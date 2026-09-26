import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';

import { type ReportRequest } from './report.types';

const FULL_WIDTH_PERCENT = 100;

export async function buildDocxReport<TRow>(request: ReportRequest<TRow>): Promise<Buffer> {
  const headerRow = new TableRow({
    tableHeader: true,
    children: request.columns.map(
      (column) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: column.header, bold: true })] })],
        }),
    ),
  });

  const dataRows = request.rows.map(
    (row) =>
      new TableRow({
        children: request.columns.map(
          (column) => new TableCell({ children: [new Paragraph(column.value(row))] }),
        ),
      }),
  );

  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({ text: request.title, heading: HeadingLevel.HEADING_1 }),
          new Table({
            width: { size: FULL_WIDTH_PERCENT, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...dataRows],
          }),
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}
