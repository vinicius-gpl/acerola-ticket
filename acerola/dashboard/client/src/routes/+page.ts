import { redirect } from '@sveltejs/kit';

/**
 * A raiz não tem tela própria: ela manda para a tela principal do sistema.
 *
 * Hoje é Chamados, e não o Painel, porque o Painel ainda não foi construído — abrir o sistema
 * direto numa tela que diz "ainda não foi construída" é a pior primeira impressão possível.
 * Quando o Painel existir, é esta linha que muda, e só ela.
 */
export function load(): never {
  redirect(307, '/tickets');
}
