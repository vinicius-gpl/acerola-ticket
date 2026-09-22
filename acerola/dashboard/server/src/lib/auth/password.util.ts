import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

/** 64 bytes é o padrão recomendado do `scrypt` para uma chave derivada de senha. */
const KEY_LENGTH = 64;

/**
 * `scrypt` da biblioteca padrão do Node, e não uma lib de terceiro (`bcrypt`, `argon2`): as
 * duas exigem compilar um binário nativo, e `scrypt` faz o mesmo trabalho — derivar uma chave
 * lenta de propósito, resistente a força bruta — sem adicionar dependência nenhuma.
 *
 * O formato salvo é `salt:hash`, os dois em hexadecimal. O salt é gerado por senha: duas
 * pessoas com a mesma senha nunca têm o mesmo hash salvo.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;

  return `${salt}:${derived.toString('hex')}`;
}

/**
 * Compara em tempo constante (`timingSafeEqual`): comparar hash por `===` vazaria, byte a
 * byte, quanto da senha está certa pelo tempo que a resposta demora a chegar.
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;

  const expected = Buffer.from(hash, 'hex');
  const derived = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  if (derived.length !== expected.length) return false;

  return timingSafeEqual(derived, expected);
}
