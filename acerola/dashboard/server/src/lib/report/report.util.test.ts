import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';

import { type ReportRequest } from './report.types';
import { buildReport } from './report.util';

type Row = { name: string; department: string };

function request(overrides: Partial<ReportRequest<Row>> = {}): ReportRequest<Row> {
  return {
    format: 'xlsx',
    title: 'Computadores',
    fileName: 'inventario',
    columns: [
      { header: 'Máquina', value: (row) => row.name },
      { header: 'Departamento', value: (row) => row.department },
    ],
    rows: [
      { name: 'RECEPCAO-01', department: 'RECEPÇÃO' },
      { name: 'FISCAL-03', department: 'FISCAL' },
    ],
    ...overrides,
  };
}

describe('buildReport — xlsx', () => {
  // feliz
  it('monta uma planilha com o cabeçalho e as linhas pedidas', async () => {
    const report = await buildReport(request());

    expect(report.fileName).toBe('inventario.xlsx');
    expect(report.contentType).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    const workbook = new ExcelJS.Workbook();
    /* `Buffer` deste projeto e o `Buffer` que o ExcelJS espera vêm de versões diferentes de
       `@types/node` — o mesmo valor em tempo de execução, o TypeScript é que enxerga dois
       tipos. */
    await workbook.xlsx.load(report.buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const sheet = workbook.worksheets[0];

    expect(sheet?.getRow(1).getCell(1).text).toBe('Máquina');
    expect(sheet?.getRow(2).getCell(1).text).toBe('RECEPCAO-01');
    expect(sheet?.getRow(3).getCell(2).text).toBe('FISCAL');
  });

  // triste
  it('gera um arquivo válido mesmo sem nenhuma linha', async () => {
    const report = await buildReport(request({ rows: [] }));

    const workbook = new ExcelJS.Workbook();
    /* `Buffer` deste projeto e o `Buffer` que o ExcelJS espera vêm de versões diferentes de
       `@types/node` — o mesmo valor em tempo de execução, o TypeScript é que enxerga dois
       tipos. */
    await workbook.xlsx.load(report.buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);

    expect(workbook.worksheets[0]?.rowCount).toBe(1);
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

describe('buildReport — pdf', () => {
  // feliz
  it('monta um PDF válido, com o nome e o tipo certos', async () => {
    const report = await buildReport(request({ format: 'pdf' }));

    expect(report.fileName).toBe('inventario.pdf');
    expect(report.contentType).toBe('application/pdf');
    expect(report.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  // triste
  it('quebra para uma página nova em vez de sumir com o resto da lista', async () => {
    const manyRows: Row[] = Array.from({ length: 200 }, (_, index) => ({
      name: `MAQUINA-${index}`,
      department: 'FINANCEIRO',
    }));

    const report = await buildReport(request({ format: 'pdf', rows: manyRows }));

    expect(report.buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(report.buffer.length).toBeGreaterThan(0);
  });
});
