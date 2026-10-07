/**
 * A EMISSÃO de uma ordem de serviço — o código que a identifica e como ele é escrito.
 *
 * O código segue o costume do git: ele é LONGO (64 caracteres, impossível de adivinhar) e é o
 * que viaja no link; o que a pessoa lê no rodapé do papel é a versão CURTA, os primeiros
 * caracteres dele. A consulta aceita os dois.
 */

/** O código inteiro: 32 bytes aleatórios, escritos em hexadecimal. */
export const SERVICE_ORDER_CODE_LENGTH = 64;

/** Quantos caracteres do código aparecem no papel e na tela. */
export const SERVICE_ORDER_SHORT_CODE_LENGTH = 12;

/** O tamanho de uma impressão digital SHA-256 em hexadecimal. */
export const SERVICE_ORDER_HASH_LENGTH = 64;

const HEXADECIMAL = /^[0-9a-f]+$/;

/** A versão curta do código (ou de uma impressão digital), para mostrar. */
export function shortServiceOrderCode(code: string): string {
  return code.slice(0, SERVICE_ORDER_SHORT_CODE_LENGTH);
}

/**
 * O que a pessoa digitou ou colou, no formato em que o código é guardado — ou nulo, quando
 * aquilo não pode ser um código.
 *
 * Nulo, e não um erro: quem chama decide o que dizer. Menos caracteres do que a versão curta
 * não é aceito de propósito — um prefixo de três letras serviria para ir adivinhando emissões.
 */
export function normalizeServiceOrderReference(text: string): string | null {
  const reference = text.trim().toLowerCase();

  if (reference.length < SERVICE_ORDER_SHORT_CODE_LENGTH) return null;
  if (reference.length > SERVICE_ORDER_CODE_LENGTH) return null;
  if (!HEXADECIMAL.test(reference)) return null;

  return reference;
}

/** O endereço da página pública que confere uma emissão. */
export function serviceOrderVerifyPath(reference: string): string {
  return `/verify/${reference}`;
}

/** O arquivo conferido é o MESMO que o sistema emitiu? Compara as duas impressões digitais. */
export function isSameServiceOrderFile(fileHash: string, issuedHash: string): boolean {
  return fileHash.trim().toLowerCase() === issuedHash.trim().toLowerCase();
}
