import { z } from 'zod';

/**
 * O CONTRATO do relatório: os três formatos que qualquer tela pode oferecer para baixar uma
 * lista. Mora aqui, e não dentro de chamados ou de computadores, porque as duas telas (e as
 * próximas que pedirem "baixar relatório") compartilham o mesmo formato de escolha.
 */
export const REPORT_FORMATS = ['xlsx', 'docx', 'pdf'] as const;

export type ReportFormat = (typeof REPORT_FORMATS)[number];

export const REPORT_FORMAT_LABELS: Record<ReportFormat, string> = {
  xlsx: 'Excel',
  docx: 'Word',
  pdf: 'PDF',
};

export const reportFormatSchema = z.enum(REPORT_FORMATS, {
  errorMap: () => ({ message: 'Escolha um formato de arquivo' }),
});

export function reportFormatLabel(format: ReportFormat): string {
  return REPORT_FORMAT_LABELS[format];
}

export function isReportFormat(value: unknown): value is ReportFormat {
  return typeof value === 'string' && (REPORT_FORMATS as readonly string[]).includes(value);
}

/** As opções na ordem em que aparecem nos botões de baixar relatório. */
export function reportFormatOptions(): { value: ReportFormat; label: string }[] {
  return REPORT_FORMATS.map((value) => ({ value, label: REPORT_FORMAT_LABELS[value] }));
}
