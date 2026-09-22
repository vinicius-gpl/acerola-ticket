/**
 * O PROTOCOLO — o número que a pessoa anota e usa para consultar o chamado depois.
 *
 * Ele é o `id` do chamado vestido de `CH-0001`. Não é uma coluna à parte de propósito: um
 * segundo número teria que ser gerado, e dois geradores de número acabam colidindo ou
 * pulando — justamente no dado que a pessoa levou anotado num papel.
 *
 * Formatar e interpretar moram no mesmo arquivo porque são a mesma regra lida nos dois
 * sentidos: a tela pública escreve `CH-0007` e depois precisa reconhecer o que a pessoa
 * digitou, com ou sem o prefixo, com ou sem os zeros.
 */
export const TICKET_PROTOCOL_PREFIX = 'CH-';

/** Quatro dígitos cobrem 9999 chamados; acima disso o número simplesmente cresce. */
const PROTOCOL_MIN_DIGITS = 4;

export function formatTicketProtocol(id: number): string {
  return `${TICKET_PROTOCOL_PREFIX}${String(id).padStart(PROTOCOL_MIN_DIGITS, '0')}`;
}

/**
 * Lê o que a pessoa digitou e devolve o número do chamado, ou nulo quando não dá para
 * entender.
 *
 * Aceita `CH-0007`, `ch 7`, `0007` e `7`: quem anotou o protocolo no celular raramente
 * digita o traço, e recusar por causa disso é transformar um acerto em erro. O que NÃO é
 * aceito é texto sem dígito nenhum e o zero — `CH-0000` não existe.
 */
export function parseTicketProtocol(value: string | null | undefined): number | null {
  if (!value) return null;

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  const id = Number.parseInt(digits, 10);
  if (!Number.isSafeInteger(id) || id <= 0) return null;

  return id;
}

export function isValidTicketProtocol(value: string | null | undefined): boolean {
  return parseTicketProtocol(value) !== null;
}
