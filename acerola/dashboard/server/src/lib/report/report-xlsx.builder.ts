import ExcelJS from 'exceljs';

import { type ReportRequest } from './report.types';

/** O nome da planilha aceita no máximo 31 caracteres — regra do próprio Excel. */
const SHEET_NAME_MAX_LENGTH = 31;

export async function buildXlsxReport<TRow>(request: ReportRequest<TRow>): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(request.title.slice(0, SHEET_NAME_MAX_LENGTH));

  sheet.columns = request.columns.map((column) => ({ header: column.header, width: 24 }));
  sheet.getRow(1).font = { bold: true };

  for (const row of request.rows) {
    sheet.addRow(request.columns.map((column) => column.value(row)));
  }

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
