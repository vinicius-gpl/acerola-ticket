import { redirect } from '@sveltejs/kit';

/**
 * A raiz não tem tela própria: ela manda para a tela principal do MVP.
 *
 * Quando a tela principal mudar, é aqui que muda — e só aqui.
 */
export function load(): never {
  redirect(307, '/tasks');
}
