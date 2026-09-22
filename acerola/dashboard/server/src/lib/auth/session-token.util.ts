import { randomBytes } from 'node:crypto';

/** O nome do cookie de sessão do login próprio. */
export const SESSION_COOKIE_NAME = 'session';

/** Sete dias: tempo suficiente para não pedir login todo dia, curto o bastante para expirar. */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * O valor do cookie É o identificador da sessão na tabela — não um JWT autocontido.
 *
 * 32 bytes aleatórios, em base64url (sem caracteres que precisem de escape em cookie): é
 * imprevisível o bastante para não ser adivinhado, e curto o bastante para não pesar em cada
 * requisição.
 */
export function createSessionToken(): string {
  return randomBytes(32).toString('base64url');
}
