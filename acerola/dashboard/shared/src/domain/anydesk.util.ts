import { z } from 'zod';

/**
 * O FORMATO de um ID do AnyDesk, num arquivo só: o schema que valida (API e formulário) e a
 * máscara que agrupa de 3 em 3 ENQUANTO a pessoa digita — a mesma ideia do `phone.util.ts`,
 * para o mesmo tipo de problema: um campo numérico com máscara, que antes não tinha
 * validação de formato nenhuma (só um limite de caracteres que aceitava qualquer coisa,
 * inclusive letra).
 */

/** Menos dígitos que isto não é um ID do AnyDesk de verdade — é engano de digitação. */
export const ANYDESK_MIN_DIGITS = 9;

/** IDs mais novos do AnyDesk chegam a este tanto de dígitos. */
export const ANYDESK_MAX_DIGITS = 10;

const ANYDESK_LENGTH_MESSAGE = `O AnyDesk tem ${ANYDESK_MIN_DIGITS} ou ${ANYDESK_MAX_DIGITS} números`;

/** Número e espaço — nada de letra. */
const ANYDESK_CHARACTERS = /^[\d\s]*$/;

/** Vazio é válido: o campo é opcional. Só quando ALGO foi digitado a contagem de dígitos vale. */
function hasValidDigitCount(value: string): boolean {
  const digits = value.replace(/\D/g, '');

  return digits.length === 0 || (digits.length >= ANYDESK_MIN_DIGITS && digits.length <= ANYDESK_MAX_DIGITS);
}

/**
 * A forma do FORMULÁRIO: texto puro, `""` quando vazio — o TanStack Form nunca vê nulo, só
 * string, e é essa a forma que `ticketFormSchema` usa direto.
 */
export const anydeskFormSchema = z
  .string()
  .trim()
  .regex(ANYDESK_CHARACTERS, 'O AnyDesk só pode ter números e espaço')
  .refine(hasValidDigitCount, ANYDESK_LENGTH_MESSAGE);

/**
 * A forma da API: `""` vira nulo — o campo é opcional, e todo chamado pode não trazer
 * AnyDesk. Mesma validação do formulário; só a ponta de saída muda.
 */
export const anydeskSchema = anydeskFormSchema
  .transform((value) => (value === '' ? null : value))
  .nullable();

/**
 * Agrupa de 3 em 3 a partir da DIREITA ENQUANTO a pessoa digita: com 9 dígitos fica
 * "000 000 000"; com 10, sobra 1 dígito solto na frente — "0 000 000 000". É o mesmo formato
 * que o próprio AnyDesk mostra.
 *
 * Reconstrói a partir só dos DÍGITOS digitados, pelo mesmo motivo do `formatPhoneInput`: letra
 * e símbolo nunca sobrevivem, e colar um ID já formatado de outro lugar não vira espaço
 * duplicado.
 */
export function formatAnydeskInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, ANYDESK_MAX_DIGITS);
  if (digits.length === 0) return '';

  const firstGroupLength = digits.length % 3 || 3;
  const firstGroup = digits.slice(0, firstGroupLength);
  const restGroups = digits.slice(firstGroupLength).match(/.{1,3}/g) ?? [];

  return [firstGroup, ...restGroups].join(' ');
}
