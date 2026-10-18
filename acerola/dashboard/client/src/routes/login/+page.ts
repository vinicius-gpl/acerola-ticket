import { redirect } from '@sveltejs/kit';

import { authApi } from '$lib/api/auth.api';
import { LOGIN_RETURN_PARAM, safeReturnPath } from '$lib/navigation/login-return';

/**
 * Quem já está logado não precisa ver a tela de login de novo — vai direto para onde ia
 * (`?next=`, o endereço que a guarda guardou) ou, sem ele, para a raiz, que abre os Chamados
 * do contexto dela (ver `routes/+page.ts`).
 *
 * `.catch(() => null)`, e não `try/catch`: o `redirect()` do SvelteKit lança um objeto
 * especial que precisa ATRAVESSAR esta função. Um `try/catch` em volta dele o engoliria junto
 * com o erro de "sem sessão" que estamos tratando.
 */
export async function load({ url }: { url: URL }): Promise<{ returnTo: string }> {
  const returnTo = safeReturnPath(url.searchParams.get(LOGIN_RETURN_PARAM));
  const user = await authApi.me().catch(() => null);
  if (user) redirect(307, returnTo);

  return { returnTo };
}
