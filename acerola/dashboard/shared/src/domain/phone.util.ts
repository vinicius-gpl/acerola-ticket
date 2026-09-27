import { z } from 'zod';

/**
 * O FORMATO de um WhatsApp brasileiro, num arquivo só: o schema que valida (API e formulário)
 * e a máscara que formata ENQUANTO a pessoa digita.
 *
 * Antes cada ponta tinha a própria ideia do que é "dígitos suficientes": o schema de chamados
 * guardava um `MIN_PHONE_DIGITS`, o link de WhatsApp guardava outro igual e solto, e não havia
 * máscara nenhuma — só um filtro que barrava letra sem organizar o número. Mudar um dos três
 * não avisava os outros dois, e a validação de formato virou só contagem de dígitos: um
 * telefone com letra no meio passava, contanto que tivesse dígito suficiente.
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

/** Só o celular (DDD + 9 dígitos) separa em 5-4; o fixo (DDD + 8) separa em 4-4. */
const MOBILE_DIGIT_COUNT = 11;
const FIRST_GROUP_MOBILE = 5;
const FIRST_GROUP_LANDLINE = 4;

/**
 * Formata ENQUANTO a pessoa digita: `DD 90000-0000` (celular) ou `DD 3000-0000` (fixo).
 *
 * Reconstrói o número a partir só dos DÍGITOS digitados — o que já resolve duas coisas de
 * uma vez: letra e símbolo nunca aparecem (não sobrevive nada que não seja `\d`), e colar um
 * número já formatado de outro lugar não vira parênteses duplicado ou traço no lugar errado.
 *
 * O `contactPhoneSchema` ainda recusa no envio — isto aqui é o que evita a pessoa ver
 * "62abc999999" no campo até chegar lá.
 */
export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, MOBILE_DIGIT_COUNT);

  if (digits.length <= 2) return digits;

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  const firstGroupLength = digits.length >= MOBILE_DIGIT_COUNT ? FIRST_GROUP_MOBILE : FIRST_GROUP_LANDLINE;
  const firstGroup = rest.slice(0, firstGroupLength);
  const secondGroup = rest.slice(firstGroupLength);

  return secondGroup ? `${ddd} ${firstGroup}-${secondGroup}` : `${ddd} ${firstGroup}`;
}
