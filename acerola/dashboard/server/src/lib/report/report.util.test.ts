import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import {
  DOCUMENT_FONT_NAME,
  DOCUMENT_PALETTE,
  DOCUMENT_TONE_SOFT_COLORS,
  excelColor,
} from './document-palette.util';
import { type BuiltDocument } from './document.type';
import { type ReportRequest } from './report.type';
import { buildReport, formatReportDate, reportDocument, reportSubtitle } from './report.util';

type Row = { name: string; department: string; status: 'Crítica' | 'Boa' };

/* Layout fixo do Excel: título (1), subtítulo (2), linha em branco (3), cabeçalho (4), dados
   a partir da 5 — os testes abaixo dependem desses números. */
const TITLE_ROW = 1;
const SUBTITLE_ROW = 2;
const HEADER_ROW = 4;
const FIRST_DATA_ROW = 5;

async function loadSheet(report: BuiltDocument) {
  const workbook = new ExcelJS.Workbook();
  /* `Buffer` deste projeto e o `Buffer` que o ExcelJS espera vêm de versões diferentes de
     `@types/node` — o mesmo valor em tempo de execução, o TypeScript é que enxerga dois tipos. */
  await workbook.xlsx.load(report.buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  return workbook.worksheets[0];
}

function request(overrides: Partial<ReportRequest<Row>> = {}): ReportRequest<Row> {
  return {
    format: 'xlsx',
    title: 'Computadores',
    subtitle: '2 computadores · gerado em 26/09/2026 16:40:00',
    fileName: 'inventario',
    columns: [
      { header: 'Máquina', value: (row) => row.name, isTitle: true },
      { header: 'Departamento', value: (row) => row.department },
      {
        header: 'Saúde',
        value: (row) => row.status,
        tone: (row) => (row.status === 'Crítica' ? 'danger' : 'success'),
      },
    ],
    rows: [
      { name: 'RECEPCAO-01', department: 'RECEPÇÃO', status: 'Crítica' },
      { name: 'FISCAL-03', department: 'FISCAL', status: 'Boa' },
    ],
    ...overrides,
  };
}

/** O total de páginas, lido de dentro do PDF — não tem biblioteca leitora instalada, mas o
 * dicionário `/Pages` sempre guarda a contagem em texto puro. */
function pdfPageCount(buffer: Buffer): number {
  const match = /\/Type\s*\/Pages[\s\S]{0,80}?\/Count\s+(\d+)/.exec(buffer.toString('latin1'));

  return match ? Number(match[1]) : 0;
}

describe('reportDocument', () => {
  // feliz
  it('turns the list into one landscape table, cell by cell', () => {
    const definition = reportDocument(request());

    expect(definition.orientation).toBe('landscape');
    expect(definition.blocks).toEqual([
      {
        kind: 'table',
        headers: ['Máquina', 'Departamento', 'Saúde'],
        rows: [
          [
            { text: 'RECEPCAO-01', tone: undefined },
            { text: 'RECEPÇÃO', tone: undefined },
            { text: 'Crítica', tone: 'danger' },
          ],
          [
            { text: 'FISCAL-03', tone: undefined },
            { text: 'FISCAL', tone: undefined },
            { text: 'Boa', tone: 'success' },
          ],
        ],
        titleColumnIndex: 0,
        emptyText: 'Nenhum registro encontrado com esse filtro.',
      },
    ]);
  });

  // triste
  it('leaves the title column out when no column identifies the row', () => {
    const definition = reportDocument(
      request({ columns: [{ header: 'Departamento', value: (row) => row.department }] }),
    );

    expect(definition.blocks[0]).toMatchObject({ kind: 'table', titleColumnIndex: undefined });
  });
});

describe('buildReport — xlsx', () => {
  // feliz
  it('writes the title, the subtitle, the header and the rows, in this order', async () => {
    const report = await buildReport(request());

    expect(report.fileName).toBe('inventario.xlsx');
    expect(report.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const sheet = await loadSheet(report);

    expect(sheet?.getRow(TITLE_ROW).getCell(1).text).toBe('Computadores');
    expect(sheet?.getRow(SUBTITLE_ROW).getCell(1).text).toBe(
      '2 computadores · gerado em 26/09/2026 16:40:00',
    );
    expect(sheet?.getRow(HEADER_ROW).getCell(1).text).toBe('Máquina');
    expect(sheet?.getRow(FIRST_DATA_ROW).getCell(1).text).toBe('RECEPCAO-01');
    expect(sheet?.getRow(FIRST_DATA_ROW + 1).getCell(2).text).toBe('FISCAL');
  });

  it('paints the status label with the same soft color as the badge on screen', async () => {
    const sheet = await loadSheet(await buildReport(request()));

    const criticalFill = sheet?.getRow(FIRST_DATA_ROW).getCell(3).fill as ExcelJS.FillPattern;
    expect(criticalFill.fgColor?.argb).toBe(excelColor(DOCUMENT_TONE_SOFT_COLORS.danger.fill));

    const goodFill = sheet?.getRow(FIRST_DATA_ROW + 1).getCell(3).fill as ExcelJS.FillPattern;
    expect(goodFill.fgColor?.argb).toBe(excelColor(DOCUMENT_TONE_SOFT_COLORS.success.fill));
  });

  it('writes the title in the brand color, centered', async () => {
    const sheet = await loadSheet(await buildReport(request()));
    const titleCell = sheet?.getRow(TITLE_ROW).getCell(1);

    expect(titleCell?.font?.color?.argb).toBe(excelColor(DOCUMENT_PALETTE.primary));
    expect(titleCell?.alignment?.horizontal).toBe('center');
  });

  it('draws a line in the theme color under the title', async () => {
    const sheet = await loadSheet(await buildReport(request()));
    const underline = sheet?.getRow(TITLE_ROW).getCell(1).border?.bottom;

    expect(underline?.color?.argb).toBe(excelColor(DOCUMENT_PALETTE.primary));
  });

  it('paints the table header with the brand color', async () => {
    const sheet = await loadSheet(await buildReport(request()));

    const headerFill = sheet?.getRow(HEADER_ROW).getCell(1).fill as ExcelJS.FillPattern;
    expect(headerFill.fgColor?.argb).toBe(excelColor(DOCUMENT_PALETTE.primary));
  });

  it('uses the document font on the title, the header and the rows', async () => {
    const sheet = await loadSheet(await buildReport(request()));
    const fontNames = [TITLE_ROW, HEADER_ROW, FIRST_DATA_ROW].map(
      (row) => sheet?.getRow(row).getCell(1).font?.name,
    );

    expect(fontNames).toEqual([DOCUMENT_FONT_NAME, DOCUMENT_FONT_NAME, DOCUMENT_FONT_NAME]);
  });

  it('keeps the header in sight while the list scrolls', async () => {
    const sheet = await loadSheet(await buildReport(request()));

    expect(sheet?.views[0]).toMatchObject({ state: 'frozen', ySplit: HEADER_ROW });
  });

  // triste
  it('still writes the header, and says so, when no row matched the filter', async () => {
    const sheet = await loadSheet(await buildReport(request({ rows: [] })));

    expect(sheet?.getRow(HEADER_ROW).getCell(1).text).toBe('Máquina');
    expect(sheet?.getRow(FIRST_DATA_ROW).getCell(1).text).toBe(
      'Nenhum registro encontrado com esse filtro.',
    );
  });
});

describe('buildReport — docx', () => {
  // feliz
  it('builds a valid Word file, with the right name and type', async () => {
    const report = await buildReport(request({ format: 'docx' }));

    expect(report.fileName).toBe('inventario.docx');
    expect(report.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    /* .docx é um zip (OOXML): os dois primeiros bytes são sempre "PK". */
    expect(report.buffer.subarray(0, 2).toString('ascii')).toBe('PK');
  });

  // triste
  it('builds a valid file even with no rows', async () => {
    const report = await buildReport(request({ format: 'docx', rows: [] }));

    expect(report.buffer.subarray(0, 2).toString('ascii')).toBe('PK');
  });

  /* O Word recusa uma tabela sem linhas: uma lista cuja única coluna é a do título (a que
     vira a faixa da ficha) não sobra com campo nenhum, e não pode derrubar a exportação. */
  it('builds a valid file when the only column is the one that titles each record', async () => {
    const report = await buildReport(
      request({ format: 'docx', columns: [{ header: 'Máquina', value: (row) => row.name, isTitle: true }] }),
    );

    expect(report.buffer.subarray(0, 2).toString('ascii')).toBe('PK');
  });
});

describe('buildReport — pdf', () => {
  // feliz
  it('builds a valid PDF, with the right name and type', async () => {
    const report = await buildReport(request({ format: 'pdf' }));

    expect(report.fileName).toBe('inventario.pdf');
    expect(report.contentType).toBe('application/pdf');
    expect(report.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  /* O rodapé com "Página X de Y" mora na margem de baixo: um relatório curto não pode ganhar
     uma segunda página, em branco, só por causa dele. */
  it('does not open a blank extra page just to fit the footer', async () => {
    const report = await buildReport(request({ format: 'pdf' }));

    expect(pdfPageCount(report.buffer)).toBe(1);
  });

  /* Com colunas estreitas, um título de coluna comprido quebra em duas linhas — a faixa do
     cabeçalho cresce junto, em vez de vazar por cima da primeira linha de dados. */
  it('fits a long column title that wraps in a narrow column', async () => {
    const manyColumns: ReportRequest<Row>['columns'] = Array.from({ length: 10 }, (_, index) => ({
      header: index === 3 ? 'Um título de coluna bem comprido' : `Coluna ${index}`,
      value: () => 'x',
    }));

    const report = await buildReport(request({ format: 'pdf', columns: manyColumns }));

    expect(pdfPageCount(report.buffer)).toBe(1);
  });

  // triste
  it('breaks into a new page instead of dropping the rest of the list', async () => {
    const manyRows: Row[] = Array.from({ length: 200 }, (_, index) => ({
      name: `MAQUINA-${index}`,
      department: 'FINANCEIRO',
      status: index % 2 === 0 ? 'Crítica' : 'Boa',
    }));

    const report = await buildReport(request({ format: 'pdf', rows: manyRows }));

    expect(pdfPageCount(report.buffer)).toBeGreaterThan(1);
  });

  it('builds a valid file even with no rows', async () => {
    const report = await buildReport(request({ format: 'pdf', rows: [] }));

    expect(pdfPageCount(report.buffer)).toBe(1);
  });
});

describe('formatReportDate', () => {
  // feliz
  it('writes the date in the company time zone', () => {
    expect(formatReportDate(new Date('2026-03-01T12:00:00.000Z'))).toBe('01/03/2026, 09:00:00');
  });

  // triste
  it('shows a dash for a date that never happened', () => {
    expect(formatReportDate(null)).toBe('—');
  });
});

describe('reportSubtitle', () => {
  // feliz
  it('counts in the plural', () => {
    expect(reportSubtitle(2, 'chamado', 'chamados')).toMatch(/^2 chamados · gerado em /);
  });

  // triste
  it('counts a single record in the singular, and none in the plural', () => {
    expect(reportSubtitle(1, 'chamado', 'chamados')).toMatch(/^1 chamado · gerado em /);
    expect(reportSubtitle(0, 'chamado', 'chamados')).toMatch(/^0 chamados · gerado em /);
  });
});
