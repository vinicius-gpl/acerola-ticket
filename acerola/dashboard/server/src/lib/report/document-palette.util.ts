import { type DocumentTone } from './document.type';

/**
 * A identidade visual dos documentos, num lugar só: os três geradores (PDF, Word e Excel) leem
 * daqui, e é por isso que um título é do mesmo azul nos três. Trocar a marca é trocar aqui.
 *
 * Sempre em hexadecimal SEM `#`: é o formato que o ExcelJS e o docx esperam. O PDF precisa do
 * `#` na frente, e por isso `pdfColor` o acrescenta.
 */
export const DOCUMENT_PALETTE = {
  /** O azul-marinho corporativo — título, cabeçalho de tabela, faixa de ficha. */
  primary: '0A3D62',
  primaryForeground: 'FFFFFF',
  foreground: '1F2937',
  subtext: '4B5563',
  border: 'E5E7EB',
  surfaceAlt: 'F8FAFC',
  background: 'FFFFFF',
} as const;

/**
 * A fonte dos documentos. No Word e no Excel vai só o NOME (quem abre o arquivo usa a fonte do
 * próprio computador); no PDF a fonte vai embutida, e por isso lá se usa a Liberation Sans
 * Narrow de `fonts/` — de mesma largura, e de licença livre.
 */
export const DOCUMENT_FONT_NAME = 'Arial Narrow';

/**
 * O selo CHEIO — fundo saturado, texto claro. Bom como uma etiqueta isolada, cercada de espaço
 * em branco; numa CÉLULA de planilha ou de tabela, a mesma cor de lado a lado pesa demais.
 */
export const DOCUMENT_TONE_COLORS: Record<DocumentTone, { fill: string; text: string }> = {
  neutral: { fill: 'E5E7EB', text: '1F2937' },
  info: { fill: '2563EB', text: 'FFFFFF' },
  success: { fill: '059669', text: 'FFFFFF' },
  warning: { fill: 'D97706', text: '1F2937' },
  danger: { fill: 'DC2626', text: 'FFFFFF' },
  brand: { fill: '0A3D62', text: 'FFFFFF' },
};

/**
 * O selo SUAVE — fundo claro, texto saturado. É a MESMA combinação do `StatusBadge` da tela
 * (`bg-red-100 text-red-700`, e por aí vai): dentro de uma célula, uma etiqueta clara com
 * texto colorido lê como destaque; uma célula inteira de vermelho lê como erro de formatação.
 */
export const DOCUMENT_TONE_SOFT_COLORS: Record<DocumentTone, { fill: string; text: string }> = {
  neutral: { fill: 'F3F4F6', text: '374151' },
  info: { fill: 'DBEAFE', text: '1D4ED8' },
  success: { fill: 'D1FAE5', text: '047857' },
  warning: { fill: 'FEF3C7', text: '92400E' },
  danger: { fill: 'FEE2E2', text: 'B91C1C' },
  brand: { fill: 'EAF2F8', text: '0A3D62' },
};

/** O hexadecimal com `FF` de opacidade na frente — o formato ARGB que o ExcelJS pede. */
export function excelColor(hex: string): string {
  return `FF${hex}`;
}

/** O hexadecimal com `#` na frente — o formato que o pdfmake entende. */
export function pdfColor(hex: string): string {
  return `#${hex}`;
}
