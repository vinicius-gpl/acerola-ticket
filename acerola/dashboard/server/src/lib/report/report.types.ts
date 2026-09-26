import { type ReportFormat } from '@template/shared/schemas/report.schema';

/**
 * O mesmo vocabulário de cor do `StatusBadge` da tela — um chamado urgente é vermelho no
 * painel e vermelho no relatório, nunca duas paletas diferentes contando a mesma coisa.
 */
export type ReportTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'brand';

/** Uma coluna do relatório: o título que a pessoa vê, e como tirar o texto de cada linha. */
export type ReportColumn<TRow> = {
  header: string;
  value: (row: TRow) => string;
  /** Pinta o valor com a cor da situação — só nas colunas onde isso faz sentido (situação, urgência, saúde). */
  tone?: (row: TRow) => ReportTone | null;
  /**
   * A coluna que identifica a linha (protocolo, nome da máquina). No Excel e no PDF ela é só
   * mais uma coluna; no Word ela vira o título de cada ficha, e por isso some da lista de
   * campos — repeti-la ali seria "Chamado CH-0007" no título e "Protocolo: CH-0007" logo
   * abaixo, dizendo a mesma coisa duas vezes.
   */
  isTitle?: boolean;
};

export type ReportRequest<TRow> = {
  format: ReportFormat;
  /** Aparece dentro do arquivo (título da planilha, do documento ou do PDF). */
  title: string;
  /** A linha embaixo do título — normalmente "N registros · gerado em ...". */
  subtitle?: string;
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
