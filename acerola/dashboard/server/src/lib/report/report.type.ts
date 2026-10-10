import { type DocumentFormat, type DocumentTone } from './document.type';

/** Uma coluna do relatório: o título que a pessoa vê, e como tirar o texto de cada linha. */
export type ReportColumn<TRow> = {
  header: string;
  value: (row: TRow) => string;
  /** Pinta o valor com a cor da situação — só nas colunas onde isso faz sentido (situação, urgência, saúde). */
  tone?: (row: TRow) => DocumentTone | null;
  /**
   * A coluna que identifica a linha (protocolo, nome da máquina). No Excel e no PDF ela é só
   * mais uma coluna; no Word ela vira o título de cada ficha.
   */
  isTitle?: boolean;
};

/** Uma LISTA para baixar: as colunas, as linhas e o formato escolhido na tela. */
export type ReportRequest<TRow> = {
  format: DocumentFormat;
  /** Aparece dentro do arquivo (título da planilha, do documento ou do PDF). */
  title: string;
  /** A linha embaixo do título — normalmente "N registros · gerado em ...". */
  subtitle?: string;
  /** O nome do arquivo baixado, sem a extensão — ela vem do formato. */
  fileName: string;
  columns: ReportColumn<TRow>[];
  rows: TRow[];
};
