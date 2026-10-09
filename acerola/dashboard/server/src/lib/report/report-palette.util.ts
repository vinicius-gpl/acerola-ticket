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
  primary: '0A3D62',
  primaryForeground: 'FFFFFF',
  foreground: '1F2937',
  subtext: '4B5563',
  border: 'E5E7EB',
  surfaceAlt: 'F8FAFC',
  background: 'FFFFFF',
  /**
   * O azul marinho corporativo da Azuos (alinhado com o Typst template.typ e documentos oficiais).
   */
  docHeading: '0A3D62',
} as const;

/**
 * O selo CHEIO — fundo saturado, texto claro. Bom como uma "etiqueta" isolada no PDF (um
 * retângulo pequeno, cercado de espaço em branco); numa CÉLULA de planilha ou de tabela, a
 * mesma cor batendo de lado a lado da célula pesa demais e briga com as listras da lista.
 */
export const REPORT_TONE_COLORS: Record<ReportTone, { fill: string; text: string }> = {
  neutral: { fill: 'E5E7EB', text: '1F2937' },
  info: { fill: '2563EB', text: 'FFFFFF' },
  success: { fill: '059669', text: 'FFFFFF' },
  warning: { fill: 'D97706', text: '1F2937' },
  danger: { fill: 'DC2626', text: 'FFFFFF' },
  brand: { fill: '0A3D62', text: 'FFFFFF' },
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
  brand: { fill: 'EAF2F8', text: '0A3D62' },
};

/** O hexadecimal com `FF` de opacidade na frente — o formato ARGB que o ExcelJS pede. */
export function excelColor(hex: string): string {
  return `FF${hex}`;
}

/** O hexadecimal com `#` na frente — o formato que o pdfkit entende. */
export function pdfColor(hex: string): string {
  return `#${hex}`;
}
