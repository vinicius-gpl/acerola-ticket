import { type ReportFormat } from '@template/shared/schemas/report.schema';

/** Uma coluna do relatório: o título que a pessoa vê, e como tirar o texto de cada linha. */
export type ReportColumn<TRow> = {
  header: string;
  value: (row: TRow) => string;
};

export type ReportRequest<TRow> = {
  format: ReportFormat;
  /** Aparece dentro do arquivo (título da planilha, do documento ou do PDF). */
  title: string;
  /** O nome do arquivo baixado, sem a extensão — ela vem do formato. */
  fileName: string;
  columns: ReportColumn<TRow>[];
  rows: TRow[];
};

export type BuiltReport = {
  buffer: Buffer;
  fileName: string;
  contentType: string;
};
