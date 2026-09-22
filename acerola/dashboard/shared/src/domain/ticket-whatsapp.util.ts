/**
 * O link de WhatsApp que o painel usa para avisar quem abriu o chamado.
 *
 * O aviso é MANUAL de propósito: abre a conversa com o texto pronto e quem atende clica em
 * enviar. Mandar sozinho exigiria uma conta de API de mensagens — infraestrutura, não
 * funcionalidade — e o legado também funcionava assim.
 *
 * O link só é montado quando a pessoa marcou que quer ser avisada. Sem isso, ter o telefone
 * não autoriza usá-lo.
 */

/** DDI do Brasil. Número digitado com DDD (10 ou 11 dígitos) não traz o país junto. */
const BRAZIL_COUNTRY_CODE = '55';

/** Com DDD são 10 (fixo) ou 11 (celular) dígitos; acima disso o DDI já veio digitado. */
const MAX_DIGITS_WITHOUT_COUNTRY_CODE = 11;

/** Menos que isto não é telefone — é engano de digitação. */
const MIN_PHONE_DIGITS = 10;

/**
 * Normaliza o telefone para o formato que o `wa.me` espera: só dígitos, com DDI.
 *
 * Devolve nulo quando o que foi digitado não dá um telefone — é o que faz o botão sumir em
 * vez de abrir uma conversa com número errado.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, '');
  if (digits.length < MIN_PHONE_DIGITS) return null;

  if (digits.length <= MAX_DIGITS_WITHOUT_COUNTRY_CODE) return `${BRAZIL_COUNTRY_CODE}${digits}`;

  return digits;
}

/**
 * O link completo, com a mensagem já escrita.
 *
 * A mensagem é texto de tela — quem recebe é a pessoa que abriu o chamado, então é
 * português. Nulo significa "não há como avisar": a tela usa isso para não mostrar o botão.
 */
export function buildWhatsAppLink(
  phone: string | null | undefined,
  message: string,
): string | null {
  const number = toWhatsAppNumber(phone);
  if (!number) return null;

  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}
