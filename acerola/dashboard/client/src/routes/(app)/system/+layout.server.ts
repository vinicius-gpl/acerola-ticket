import { sidebarOpenFromCookie } from '$lib/utils/sidebar-state.util';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ cookies }) => ({
  sidebarOpen: sidebarOpenFromCookie(cookies),
});
