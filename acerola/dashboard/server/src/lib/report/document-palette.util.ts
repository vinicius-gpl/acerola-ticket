import { type DocumentTone } from './document.type';

/**
 * As cores dos documentos, num lugar só: os três geradores (PDF, Word e Excel) leem daqui, e é
 * por isso que um título é do mesmo roxo nos três.
 *
 * Os valores são os do TEMA CLARO da tela (`client/src/lib/theme/tokens.css`), copiados sem
 * alteração — o documento tem a mesma identidade do painel. O servidor não lê CSS, então a
 * cópia é à mão: mudou um token lá, muda o mesmo nome aqui.
 *
 * Sempre em hexadecimal SEM `#`: é o formato que o ExcelJS e o docx esperam. O PDF precisa do
 * `#` na frente, e por isso `pdfColor` o acrescenta.
 */
export const DOCUMENT_PALETTE = {
  /** `--primary` — título, cabeçalho de tabela, faixa de ficha, fio sob o cabeçalho. */
  primary: '7C3AED',
  /** `--primary-foreground`. */
  primaryForeground: 'FFFFFF',
  /** `--foreground`. */
  foreground: '0F172A',
  /** `--muted-foreground`. */
  subtext: '64748B',
  /** `--border`. */
  border: 'E2E8F0',
  /** `--background` — a linha zebrada da tabela. */
  surfaceAlt: 'F8FAFC',
  /** `--card` — o papel. */
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
  neutral: { fill: 'E2E8F0', text: '0F172A' },
  info: { fill: '1D4ED8', text: 'FFFFFF' },
  success: { fill: '047857', text: 'FFFFFF' },
  warning: { fill: 'B45309', text: 'FFFFFF' },
  danger: { fill: 'E11D48', text: 'FFFFFF' },
  brand: { fill: '7C3AED', text: 'FFFFFF' },
};

/**
 * O selo SUAVE — fundo claro, texto saturado. São os pares `--<tom>-soft` / `--<tom>` do tema,
 * os mesmos do selo de situação da tela: dentro de uma célula, uma etiqueta clara com texto
 * colorido lê como destaque; uma célula inteira de vermelho lê como erro de formatação.
 */
export const DOCUMENT_TONE_SOFT_COLORS: Record<DocumentTone, { fill: string; text: string }> = {
  neutral: { fill: 'F1F5F9', text: '64748B' },
  info: { fill: 'DBEAFE', text: '1D4ED8' },
  success: { fill: 'D1FAE5', text: '047857' },
  warning: { fill: 'FEF3C7', text: 'B45309' },
  danger: { fill: 'FFE4E6', text: 'E11D48' },
  brand: { fill: 'EDE9FE', text: '7C3AED' },
};

/** O hexadecimal com `FF` de opacidade na frente — o formato ARGB que o ExcelJS pede. */
export function excelColor(hex: string): string {
  return `FF${hex}`;
}

/** O hexadecimal com `#` na frente — o formato que o pdfmake entende. */
export function pdfColor(hex: string): string {
  return `#${hex}`;
}
