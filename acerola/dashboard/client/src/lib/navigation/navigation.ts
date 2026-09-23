import type { LucideIcon } from '@lucide/svelte';
import HardDrive from '@lucide/svelte/icons/hard-drive';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import LifeBuoy from '@lucide/svelte/icons/life-buoy';
import ListChecks from '@lucide/svelte/icons/list-checks';
import Monitor from '@lucide/svelte/icons/monitor';
import Package from '@lucide/svelte/icons/package';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Wallet from '@lucide/svelte/icons/wallet';
import Wifi from '@lucide/svelte/icons/wifi';
import Wrench from '@lucide/svelte/icons/wrench';

/**
 * O MENU LATERAL, num lugar só.
 *
 * Tela nova que precisa aparecer no menu = UMA linha aqui. O `AppShell` desenha a partir desta
 * lista e o `useAppShellModel` decide o item ativo a partir dela — duas listas separadas
 * divergiriam no primeiro item acrescentado, e o menu acenderia o item errado.
 *
 * `to` é a rota do SvelteKit (a pasta em `src/routes`). O item fica aceso também nas
 * subrotas: `/tickets/42` acende "Chamados".
 *
 * A ORDEM É A DO TRABALHO, não a da construção: começa no que a pessoa olha de manhã
 * (Painel, Chamados), passa pelo parque de máquinas (Inventário, Manutenção, Depósito,
 * Descarte), pela rede, e termina no que serve para decidir compra (Inteligência, Orçamento).
 * Várias dessas áreas ainda não foram construídas — elas abrem uma tela que diz o que vai
 * viver ali. Esconder o item até a área ficar pronta faria o sistema parecer menor do que é;
 * mostrar um item que abre uma tela em branco faria parecer quebrado.
 */
export type NavItem = {
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Painel', to: '/dashboard', icon: Monitor },
  { key: 'tickets', label: 'Chamados', to: '/tickets', icon: LifeBuoy },
  { key: 'computers', label: 'Inventário', to: '/computers', icon: HardDrive },
  { key: 'maintenance', label: 'Manutenção', to: '/maintenance', icon: Wrench },
  { key: 'parts', label: 'Depósito', to: '/parts', icon: Package },
  { key: 'disposal', label: 'Descarte', to: '/disposal', icon: Trash2 },
  { key: 'network', label: 'Rede', to: '/network', icon: Wifi },
  { key: 'insights', label: 'Inteligência', to: '/insights', icon: Lightbulb },
  { key: 'budget', label: 'Orçamento', to: '/budget', icon: Wallet },
  /* A feature de exemplo do template. Sai quando não servir mais de molde (skill
     `remover-exemplo`) — ela não faz parte do sistema de TI. */
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
