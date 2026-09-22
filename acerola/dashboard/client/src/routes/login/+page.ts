import { redirect } from '@sveltejs/kit';

import { authApi } from '$lib/api/auth.api';

/**
 * Quem já está logado não precisa ver a tela de login de novo — manda direto para `/tasks`.
 *
 * `.catch(() => null)`, e não `try/catch`: o `redirect()` do SvelteKit lança um objeto
 * especial que precisa ATRAVESSAR esta função. Um `try/catch` em volta dele o engoliria junto
 * com o erro de "sem sessão" que estamos tratando.
 */
export async function load(): Promise<void> {
  const user = await authApi.me().catch(() => null);
  if (user) redirect(307, '/tasks');
}
