import { type ReportFormat } from '@template/shared/schemas/report.schema';

import { buildDocxReport } from './report-docx.builder';
import { buildPdfReport } from './report-pdf.builder';
import { buildXlsxReport } from './report-xlsx.builder';
import { type BuiltReport, type ReportRequest } from './report.types';

const CONTENT_TYPES: Record<ReportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};

/**
 * O ÚNICO caminho para virar uma lista em arquivo. Quem chama monta as colunas e as linhas já
 * traduzidas para português — este arquivo só decide qual biblioteca desenha o quê.
 */
export async function buildReport<TRow>(request: ReportRequest<TRow>): Promise<BuiltReport> {
  return {
    buffer: await renderBuffer(request),
    fileName: `${request.fileName}.${request.format}`,
    contentType: CONTENT_TYPES[request.format],
  };
}

async function renderBuffer<TRow>(request: ReportRequest<TRow>): Promise<Buffer> {
  if (request.format === 'xlsx') return buildXlsxReport(request);
  if (request.format === 'docx') return buildDocxReport(request);

  return buildPdfReport(request);
}

/**
 * A data de uma coluna de relatório, no fuso da empresa — os arquivos são baixados para
 * imprimir ou arquivar, e não têm um navegador por perto para converter o fuso na hora de ler.
 */
export function formatReportDate(value: Date | null): string {
  if (!value) return '—';

  return value.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
