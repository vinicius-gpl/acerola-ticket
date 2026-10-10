import { renderDocxDocument } from './document-docx.util';
import { renderPdfDocument } from './document-pdf.util';
import { renderXlsxDocument } from './document-xlsx.util';
import {
  type BuiltDocument,
  type DocumentDefinition,
  type DocumentFormat,
} from './document.type';

const CONTENT_TYPES: Record<DocumentFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
};

/**
 * O ÚNICO caminho para um documento virar arquivo. Quem chama entrega a definição (o que o
 * documento diz) e escolhe o formato — este arquivo só decide qual gerador a desenha.
 *
 * @param fileName O nome do arquivo baixado, sem a extensão — ela vem do formato.
 */
export async function buildDocument(
  definition: DocumentDefinition,
  format: DocumentFormat,
  fileName: string,
): Promise<BuiltDocument> {
  return {
    buffer: await renderDocument(definition, format),
    fileName: `${fileName}.${format}`,
    contentType: CONTENT_TYPES[format],
  };
}

async function renderDocument(definition: DocumentDefinition, format: DocumentFormat): Promise<Buffer> {
  if (format === 'xlsx') return renderXlsxDocument(definition);
  if (format === 'docx') return renderDocxDocument(definition);

  return renderPdfDocument(definition);
}
