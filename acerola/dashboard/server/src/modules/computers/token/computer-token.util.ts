import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * O TOKEN que identifica um agente.
 *
 * Ele é tratado como senha, e não como identificador: gerado por sorteio, mostrado uma única
 * vez e guardado só em hash. A diferença importa porque um token vazado não é um incômodo —
 * é uma máquina falsa mandando telemetria como se fosse a da recepção, e o TI decidindo
 * compra em cima de número inventado.
 *
 * Não há "recuperar token": se a pessoa perdeu, gera-se outro. Poder recuperá-lo exigiria
 * guardá-lo legível, que é exatamente o que não se quer.
 */

/**
 * 32 bytes = 256 bits de sorteio. É o mesmo tamanho que se usa para chave de sessão, e o
 * motivo é o mesmo: precisa ser grande o bastante para não valer a pena tentar adivinhar.
 */
const TOKEN_BYTES = 32;

/** O texto que a pessoa copia para o agente. */
export function createComputerToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

/**
 * O que vai para o banco.
 *
 * SHA-256 sem sal, e isso é deliberado: sal existe para proteger senha escolhida por gente,
 * que é curta e previsível. Este token são 256 bits sorteados — não há dicionário que o
 * alcance, e um hash rápido é o que permite conferi-lo a cada reconexão de cada máquina sem
 * o servidor virar gargalo.
 */
export function hashComputerToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Confere o token apresentado contra o hash guardado.
 *
 * A comparação é de tempo constante: `===` sai no primeiro caractere diferente, e o tempo que
 * ele leva conta quantos caracteres bateram. Com isso dá para descobrir um token caractere a
 * caractere, sem nunca acertá-lo inteiro por sorte.
 */
export function matchesComputerToken(token: string, storedHash: string): boolean {
  if (!token || !storedHash) return false;

  const candidate = Buffer.from(hashComputerToken(token), 'hex');
  const stored = Buffer.from(storedHash, 'hex');

  /* `timingSafeEqual` exige o mesmo tamanho; hash guardado torto significa não confere. */
  if (candidate.length !== stored.length) return false;

  return timingSafeEqual(candidate, stored);
}
