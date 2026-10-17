import { redirect } from '@sveltejs/kit';
import { type SessionUser } from '@template/shared/schemas/user.schema';

import { authApi } from '$lib/api/auth.api';
import { ApiError } from '$lib/api/http-client';
import { loginPathFor } from '$lib/navigation/login-return';

/**
 * A GUARDA de sessão: todo o resto do sistema mora dentro deste grupo de rota, e ninguém
 * chega em nenhuma tela dele sem sessão válida.
 *
 * `/api/auth/me` é a mesma origem de verdade que o backend usa para tudo o mais — não existe
 * um segundo lugar guardando "está logado" que pudesse divergir dele.
 *
 * Quem chega sem sessão vai para o LOGIN, levando o endereço em que estava (`?next=`): todo
 * mundo tem conta, inclusive quem só abre chamado, e depois de entrar a pessoa volta para a
 * tela que pediu.
 *
 * Só 401 vira redirecionamento. Qualquer outro erro (rede caída, servidor fora) sobe para a
 * tela de erro padrão do SvelteKit — confundir "API fora do ar" com "não estou logado"
 * tiraria a pessoa da tela por um problema que login nenhum resolve.
 */
export async function load({ url }: { url: URL }): Promise<{ user: SessionUser }> {
  try {
    return { user: await authApi.me() };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(307, loginPathFor(url));
    throw error;
  }
}
