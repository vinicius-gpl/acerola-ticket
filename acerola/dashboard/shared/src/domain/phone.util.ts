import { z } from 'zod';

/**
 * O FORMATO de um WhatsApp brasileiro, num arquivo só: o schema que valida (API e formulário)
 * e o filtro que barra letra ENQUANTO a pessoa digita.
 *
 * Antes cada ponta tinha a própria ideia do que é "dígitos suficientes": o schema de chamados
 * guardava um `MIN_PHONE_DIGITS`, o link de WhatsApp guardava outro igual e solto, e o filtro
 * de digitação vivia dentro do componente do formulário. Mudar um dos três não avisava os
 * outros dois — foi assim que a validação de formato virou só contagem de dígitos e passou a
 * aceitar letra no meio, contanto que tivesse dígito suficiente.
 */

export const CONTACT_PHONE_MAX_LENGTH = 40;

/** Menos que isto não é telefone com DDD — é engano de digitação. */
export const MIN_PHONE_DIGITS = 10;

/** Número, espaço, parênteses, traço e um `+` de código de país — nada de letra. */
const PHONE_CHARACTERS = /^[\d\s()+-]*$/;

/**
 * O telefone é exigido porque é como o TI retorna quando o chamado precisa de conversa. A
 * contagem de dígitos ignora parênteses, traço e espaço — senão quem digita bonito seria
 * recusado e quem digita tudo junto passaria.
 *
 * A checagem de CARACTERE vem antes da de QUANTIDADE: sem ela, "abc" some ao contar dígitos
 * (`\D` remove tudo que não é número), e um telefone com letra no meio passava, contanto que
 * tivesse dígitos suficientes.
 */
export const contactPhoneSchema = z
  .string({ required_error: 'Informe seu WhatsApp com DDD' })
  .trim()
  .max(CONTACT_PHONE_MAX_LENGTH, 'Esse telefone é longo demais')
  .regex(PHONE_CHARACTERS, 'O WhatsApp só pode ter números, espaço, parênteses e traço')
  .refine(
    (value) => value.replace(/\D/g, '').length >= MIN_PHONE_DIGITS,
    'Informe o WhatsApp com DDD',
  );

/**
 * Bloqueia letra e símbolo estranho ENQUANTO a pessoa digita.
 *
 * O `contactPhoneSchema` já recusa no envio — mas esperar até lá deixaria "62abc999999"
 * parado no campo até a pessoa tentar avançar, quando dava pra nunca ter deixado a letra
 * entrar. Mesmo caractere permitido do schema acima, pro filtro nunca bloquear o que a
 * validação aceitaria.
 */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d\s()+-]/g, '');
}
