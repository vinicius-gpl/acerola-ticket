import { redirect } from '@sveltejs/kit';
import { type SessionUser } from '@template/shared/schemas/user.schema';

import { authApi } from '$lib/api/auth.api';
import { ApiError } from '$lib/api/http-client';

/**
 * A GUARDA de sessão: todo o resto do sistema mora dentro deste grupo de rota, e ninguém
 * chega em nenhuma tela dele sem sessão válida.
 *
 * `/api/auth/me` é a mesma origem de verdade que o backend usa para tudo o mais — não existe
 * um segundo lugar guardando "está logado" que pudesse divergir dele.
 *
 * Só 401 vira redirecionamento para `/login`. Qualquer outro erro (rede caída, servidor fora)
 * sobe para a tela de erro padrão do SvelteKit — confundir "API fora do ar" com "não estou
 * logado" mandaria a pessoa preencher senha de novo por um problema que login nenhum resolve.
 */
export async function load(): Promise<{ user: SessionUser }> {
  try {
    return { user: await authApi.me() };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect(307, '/login');
    throw error;
  }
}
