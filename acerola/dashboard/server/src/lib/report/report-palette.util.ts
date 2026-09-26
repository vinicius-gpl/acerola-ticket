import { type ReportTone } from './report.types';

/**
 * A MESMA identidade visual da tela (Catppuccin Latte, `client/src/lib/theme/tokens.css`),
 * copiada aqui porque o relatório é gerado no servidor — sem CSS, sem variável, só o valor
 * final. Um tema novo na tela também troca aqui, à mão, para os dois não discordarem.
 *
 * Sempre em hexadecimal SEM `#`: é o formato que o ExcelJS e o docx esperam; o PDF é o único
 * que precisa do `#` na frente, e por isso `pdfColor` o acrescenta.
 */
export const REPORT_PALETTE = {
  primary: '8839EF',
  primaryForeground: 'FFFFFF',
  foreground: '4C4F69',
  subtext: '6C6F85',
  border: 'ACB0BE',
  surfaceAlt: 'E6E9EF',
  background: 'FFFFFF',
  /**
   * O cinza-chumbo dos relatórios de escritório — usado só no Word. A cor da marca (roxa)
   * funciona bem como destaque numa tela ou num PDF colorido; num documento de texto ela lê
   * como informal. Um cabeçalho escuro neutro é o que os modelos corporativos usam.
   */
  docHeading: '1F2937',
} as const;

/**
 * O selo CHEIO — fundo saturado, texto claro. Bom como uma "etiqueta" isolada no PDF (um
 * retângulo pequeno, cercado de espaço em branco); numa CÉLULA de planilha ou de tabela, a
 * mesma cor batendo de lado a lado da célula pesa demais e briga com as listras da lista.
 */
export const REPORT_TONE_COLORS: Record<ReportTone, { fill: string; text: string }> = {
  neutral: { fill: 'ACB0BE', text: '4C4F69' },
  info: { fill: '209FB5', text: 'FFFFFF' },
  success: { fill: '40A02B', text: 'FFFFFF' },
  warning: { fill: 'DF8E1D', text: '4C4F69' },
  danger: { fill: 'D20F39', text: 'FFFFFF' },
  brand: { fill: '8839EF', text: 'FFFFFF' },
};

/**
 * O selo SUAVE — fundo claro, texto saturado. É a MESMA combinação do `StatusBadge` da tela
 * (`bg-red-100 text-red-700`, e por aí vai): dentro de uma célula de Excel ou Word, uma etiqueta
 * clara com texto colorido lê como destaque; uma célula inteira pintada de vermelho lê como
 * erro de formatação.
 */
export const REPORT_TONE_SOFT_COLORS: Record<ReportTone, { fill: string; text: string }> = {
  neutral: { fill: 'F3F4F6', text: '374151' },
  info: { fill: 'DBEAFE', text: '1D4ED8' },
  success: { fill: 'D1FAE5', text: '047857' },
  warning: { fill: 'FEF3C7', text: '92400E' },
  danger: { fill: 'FEE2E2', text: 'B91C1C' },
  brand: { fill: 'F3E8FD', text: '8839EF' },
};

/** O hexadecimal com `FF` de opacidade na frente — o formato ARGB que o ExcelJS pede. */
export function excelColor(hex: string): string {
  return `FF${hex}`;
}

/** O hexadecimal com `#` na frente — o formato que o pdfkit entende. */
export function pdfColor(hex: string): string {
  return `#${hex}`;
}
