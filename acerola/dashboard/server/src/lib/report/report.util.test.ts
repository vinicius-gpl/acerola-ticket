import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { excelColor, REPORT_PALETTE, REPORT_TONE_SOFT_COLORS } from './report-palette.util';
import { type ReportRequest } from './report.types';
import { buildReport } from './report.util';

type Row = { name: string; department: string; status: 'Crítica' | 'Boa' };

/* Layout fixo do Excel: título (1), subtítulo (2), linha em branco (3), cabeçalho (4), dados
   a partir da 5 — os testes abaixo dependem desses números. */
const TITLE_ROW = 1;
const SUBTITLE_ROW = 2;
const HEADER_ROW = 4;
const FIRST_DATA_ROW = 5;

async function loadWorkbook(report: Awaited<ReturnType<typeof buildReport<Row>>>) {
  const workbook = new ExcelJS.Workbook();
  /* `Buffer` deste projeto e o `Buffer` que o ExcelJS espera vêm de versões diferentes de
     `@types/node` — o mesmo valor em tempo de execução, o TypeScript é que enxerga dois tipos. */
  await workbook.xlsx.load(report.buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

  return workbook;
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

describe('buildReport — xlsx', () => {
  // feliz
  it('monta o título, o subtítulo, o cabeçalho e as linhas, nessa ordem', async () => {
    const report = await buildReport(request());

    expect(report.fileName).toBe('inventario.xlsx');
    expect(report.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const sheet = (await loadWorkbook(report)).worksheets[0];

    expect(sheet?.getRow(TITLE_ROW).getCell(1).text).toBe('Computadores');
    expect(sheet?.getRow(SUBTITLE_ROW).getCell(1).text).toBe(
      '2 computadores · gerado em 26/09/2026 16:40:00',
    );
    expect(sheet?.getRow(HEADER_ROW).getCell(1).text).toBe('Máquina');
    expect(sheet?.getRow(FIRST_DATA_ROW).getCell(1).text).toBe('RECEPCAO-01');
    expect(sheet?.getRow(FIRST_DATA_ROW + 1).getCell(2).text).toBe('FISCAL');
  });

  it('pinta a etiqueta da situação com a mesma cor suave do selo da tela', async () => {
    const report = await buildReport(request());
    const sheet = (await loadWorkbook(report)).worksheets[0];

    const criticalFill = sheet?.getRow(FIRST_DATA_ROW).getCell(3).fill as ExcelJS.FillPattern;
    expect(criticalFill.fgColor?.argb).toBe(excelColor(REPORT_TONE_SOFT_COLORS.danger.fill));

    const goodFill = sheet?.getRow(FIRST_DATA_ROW + 1).getCell(3).fill as ExcelJS.FillPattern;
    expect(goodFill.fgColor?.argb).toBe(excelColor(REPORT_TONE_SOFT_COLORS.success.fill));
  });

  it('usa a cor da marca no título', async () => {
    const report = await buildReport(request());
    const sheet = (await loadWorkbook(report)).worksheets[0];

    const titleFill = sheet?.getRow(TITLE_ROW).getCell(1).fill as ExcelJS.FillPattern;
    expect(titleFill.fgColor?.argb).toBe(excelColor(REPORT_PALETTE.primary));
  });

  // triste
  it('gera um arquivo válido mesmo sem nenhuma linha', async () => {
    const report = await buildReport(request({ rows: [] }));
    const sheet = (await loadWorkbook(report)).worksheets[0];

    expect(sheet?.getRow(HEADER_ROW).getCell(1).text).toBe('Máquina');
    expect(sheet?.rowCount).toBe(HEADER_ROW);
  });
});

describe('buildReport — docx', () => {
  // feliz
  it('monta um Word válido, com o nome e o tipo certos', async () => {
    const report = await buildReport(request({ format: 'docx' }));

    expect(report.fileName).toBe('inventario.docx');
    expect(report.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    /* .docx é um zip (OOXML): os dois primeiros bytes são sempre "PK". */
    expect(report.buffer.subarray(0, 2).toString('ascii')).toBe('PK');
  });

  // triste
  it('gera um arquivo válido mesmo sem nenhuma linha', async () => {
    const report = await buildReport(request({ format: 'docx', rows: [] }));

    expect(report.buffer.length).toBeGreaterThan(0);
  });
});

/** O total de páginas, lido de dentro do PDF — não tem biblioteca leitora instalada, mas o
 * dicionário `/Pages` sempre guarda a contagem em texto puro. */
function pdfPageCount(buffer: Buffer): number {
  const match = /\/Type\s*\/Pages[\s\S]{0,80}?\/Count\s+(\d+)/.exec(buffer.toString('latin1'));

  return match ? Number(match[1]) : 0;
}

describe('buildReport — pdf', () => {
  // feliz
  it('monta um PDF válido, com o nome e o tipo certos', async () => {
    const report = await buildReport(request({ format: 'pdf' }));

    expect(report.fileName).toBe('inventario.pdf');
    expect(report.contentType).toBe('application/pdf');
    expect(report.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  /* Bug real: escrever "Página X de Y" dentro da margem inferior fazia o pdfkit abrir uma
     página extra, em branco, só para caber o rodapé — um relatório de 3 linhas saía com 2
     páginas, a segunda vazia. */
  it('não abre uma página extra em branco só para caber o rodapé', async () => {
    const report = await buildReport(request({ format: 'pdf' }));

    expect(pdfPageCount(report.buffer)).toBe(1);
  });

  // triste
  it('quebra para uma página nova em vez de sumir com o resto da lista', async () => {
    const manyRows: Row[] = Array.from({ length: 200 }, (_, index) => ({
      name: `MAQUINA-${index}`,
      department: 'FINANCEIRO',
      status: index % 2 === 0 ? 'Crítica' : 'Boa',
    }));

    const report = await buildReport(request({ format: 'pdf', rows: manyRows }));

    expect(report.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdfPageCount(report.buffer)).toBeGreaterThan(1);
  });
});
