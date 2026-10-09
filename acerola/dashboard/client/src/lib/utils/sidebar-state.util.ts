import type { Cookies } from '@sveltejs/kit';

import { SIDEBAR_COOKIE_NAME } from '$lib/components/acerola-app-shell/acerola-app-shell.constants';

/** Resolve o estado da barra durante o SSR, antes de o navegador desenhar a primeira tela. */
export function sidebarOpenFromCookie(cookies: Cookies): boolean {
  return cookies.get(SIDEBAR_COOKIE_NAME) !== 'false';
}
