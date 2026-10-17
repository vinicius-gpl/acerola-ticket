import { sidebarOpenFromCookie } from '$lib/utils/sidebar-state.util';
import type { LayoutLoad } from './$types';

/* No navegador, não no servidor: a tela é um SPA estático, sem servidor do SvelteKit. */
export const load: LayoutLoad = () => ({
  sidebarOpen: sidebarOpenFromCookie(document.cookie),
});
