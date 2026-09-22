import LifeBuoy from '@lucide/svelte/icons/life-buoy';
import ListChecks from '@lucide/svelte/icons/list-checks';
import type { LucideIcon } from '@lucide/svelte';

/**
 * O MENU LATERAL, num lugar só.
 *
 * Tela nova que precisa aparecer no menu = UMA linha aqui. O `AppShell` desenha a partir desta
 * lista e o `useAppShellModel` decide o item ativo a partir dela — duas listas separadas
 * divergiriam no primeiro item acrescentado, e o menu acenderia o item errado.
 *
 * `to` é a rota do SvelteKit (a pasta em `src/routes`). O item fica aceso também nas
 * subrotas: `/tasks/42` acende "Tarefas".
 */
export type NavItem = {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { key: 'tickets', label: 'Chamados', to: '/tickets', icon: LifeBuoy },
  { key: 'tasks', label: 'Tarefas', to: '/tasks', icon: ListChecks },
];

/**
 * O item ativo pelo prefixo do caminho — o mais longo que casar vence, para `/tasks/archive`
 * acender "Arquivo" e não "Tarefas", se os dois existirem.
 */
export function activeNavKeyOf(
  pathname: string,
  items: readonly NavItem[] = NAV_ITEMS,
): string | undefined {
  const matches = items.filter(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );

  return matches.sort((a, b) => b.to.length - a.to.length)[0]?.key;
}
