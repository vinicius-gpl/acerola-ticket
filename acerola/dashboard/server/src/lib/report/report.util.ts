import { type BuiltDocument, type DocumentDefinition } from './document.type';
import { buildDocument } from './document.util';
import { type ReportRequest } from './report.type';

const REPORT_TIME_ZONE = 'America/Sao_Paulo';
const EMPTY_REPORT_TEXT = 'Nenhum registro encontrado com esse filtro.';

/**
 * Uma lista da tela virando arquivo. Quem chama monta as colunas e as linhas já traduzidas
 * para português; aqui a lista vira a definição de um documento com uma tabela só, e o
 * documento segue o mesmo caminho de todos os outros (`buildDocument`).
 */
export async function buildReport<TRow>(request: ReportRequest<TRow>): Promise<BuiltDocument> {
  return buildDocument(reportDocument(request), request.format, request.fileName);
}

/** A definição do documento de uma lista: deitado, para caber muita coluna, e uma tabela. */
export function reportDocument<TRow>(request: ReportRequest<TRow>): DocumentDefinition {
  const titleColumnIndex = request.columns.findIndex((column) => column.isTitle);

  return {
    title: request.title,
    subtitle: request.subtitle,
    reference: request.title,
    orientation: 'landscape',
    blocks: [
      {
        kind: 'table',
        headers: request.columns.map((column) => column.header),
        rows: request.rows.map((row) =>
          request.columns.map((column) => ({ text: column.value(row), tone: column.tone?.(row) })),
        ),
        titleColumnIndex: titleColumnIndex === -1 ? undefined : titleColumnIndex,
        emptyText: EMPTY_REPORT_TEXT,
      },
    ],
  };
}

/**
 * A data de uma coluna de relatório, no fuso da empresa — os arquivos são baixados para
 * imprimir ou arquivar, e não têm um navegador por perto para converter o fuso na hora de ler.
 */
export function formatReportDate(value: Date | null): string {
  if (!value) return '—';

  return value.toLocaleString('pt-BR', { timeZone: REPORT_TIME_ZONE });
}

/** A linha padrão embaixo do título: quantos vieram, e quando o arquivo foi gerado. */
export function reportSubtitle(count: number, singular: string, plural: string): string {
  const noun = count === 1 ? singular : plural;
  const generatedAt = new Date().toLocaleString('pt-BR', { timeZone: REPORT_TIME_ZONE });

  return `${count} ${noun} · gerado em ${generatedAt}`;
}
