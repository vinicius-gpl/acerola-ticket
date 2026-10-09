import { compileTypstDocument } from './typst/typst-compiler.util';
import { type ReportRequest } from './report.types';

/**
 * Constrói relatórios em PDF utilizando o compilador Typst com a identidade visual Azuos
 * (`template.typ` + `report.typ`).
 *
 * Utiliza o layout horizontal (landscape) em papel A4, tipografia corporativa Arial,
 * cabeçalho escuro navy (`#0A3D62`), linhas zebradas suaves, selos coloridos para status
 * e rodapé dinâmico com numeração de páginas contextuais.
 */
export async function buildPdfReport<TRow>(request: ReportRequest<TRow>): Promise<Buffer> {
  const headers = request.columns.map((column) => column.header);

  const rows = request.rows.map((row) =>
    request.columns.map((column) => {
      const val = column.value(row);
      const tone = column.tone?.(row);
      return {
        text: val,
        tone: tone ?? null,
        bold: Boolean(column.isTitle),
      };
    }),
  );

  const data = {
    title: request.title,
    subtitle: request.subtitle ?? '',
    headers,
    rows,
    note: 'Relatório emitido pelo sistema Acerola Ticket',
    docRef: request.fileName.toUpperCase(),
  };

  return compileTypstDocument({
    documentPath: 'documents/report.typ',
    data,
  });
}

/**
 * Função mantida para retrocompatibilidade histórica; no Typst a numeração de páginas
 * é gerenciada nativamente via `context counter(page).display()`.
 */
export function writePageNumbers(): void {}
