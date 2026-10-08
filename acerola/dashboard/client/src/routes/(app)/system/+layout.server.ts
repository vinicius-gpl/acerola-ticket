import { sidebarOpenFromCookie } from '$lib/server/sidebar-state';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies }) => ({
  sidebarOpen: sidebarOpenFromCookie(cookies),
});
