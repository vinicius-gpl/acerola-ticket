import { SIDEBAR_COOKIE_NAME } from '$lib/components/acerola-app-shell/acerola-app-shell.constants';

/**
 * Lê no navegador se a barra lateral estava aberta, pelo cookie que o `SidebarProvider` grava.
 *
 * Recebe o texto de `document.cookie` em vez de um `Cookies` do SvelteKit porque a tela é um
 * SPA estático (`adapter-static`): em produção não existe servidor do SvelteKit para rodar um
 * `+layout.server.ts`, e o pedido de `__data.json` voltava o `index.html` do fallback.
 */
export function sidebarOpenFromCookie(cookieHeader: string): boolean {
  const value = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
    ?.slice(SIDEBAR_COOKIE_NAME.length + 1);

  return value !== 'false';
}
