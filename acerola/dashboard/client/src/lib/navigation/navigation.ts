import type { LucideIcon } from '@lucide/svelte';
import HardDrive from '@lucide/svelte/icons/hard-drive';
import Lightbulb from '@lucide/svelte/icons/lightbulb';
import LifeBuoy from '@lucide/svelte/icons/life-buoy';
import ListChecks from '@lucide/svelte/icons/list-checks';
import Monitor from '@lucide/svelte/icons/monitor';
import Package from '@lucide/svelte/icons/package';
import PackageOpen from '@lucide/svelte/icons/package-open';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Wallet from '@lucide/svelte/icons/wallet';
import Wifi from '@lucide/svelte/icons/wifi';
import Wrench from '@lucide/svelte/icons/wrench';
import { ROLE_CONTEXTS, type RoleContext } from '@template/shared/domain/role-context.util';

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
 * `contexts` é a parte nova: o menu NÃO é o mesmo nas três áreas do sistema. Infraestrutura
 * cuida do parque de máquinas e tem o menu inteiro; Sistema é só chamado (e, mais adiante, a
 * ponte com o GitHub); Manutenção é inventário geral, orçamento e chamado externo. Um item
 * aparece no contexto que o usa, e em nenhum outro — mostrar "Rede" para quem cuida de
 * cadeira e mesa é pedir para a pessoa aprender a ignorar metade do menu.
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
  /** Em quais contextos este item aparece. Nunca vazia — item sem contexto é item inacessível. */
  contexts: readonly RoleContext[];
};

/** Atalho de leitura para o item que vale nos três contextos. Hoje só Chamados é assim. */
const EVERY_CONTEXT = ROLE_CONTEXTS;

export const NAV_ITEMS: NavItem[] = [
  /* O Painel é do PARQUE DE MÁQUINAS (quantas máquinas, quanto de memória, o que manter) —
     por isso ele é de Infraestrutura, e não dos três contextos. Em Manutenção ele abriria uma
     tela de zeros, que é o jeito mais rápido de a pessoa achar que o sistema está quebrado.
     Sistema e Manutenção abrem nos Chamados; o painel de cada um, se fizer sentido, é tela
     nova — não esta. */
  { key: 'dashboard', label: 'Painel', to: '/dashboard', icon: Monitor, contexts: ['infra'] },
  /* Chamado é o chão dos três: o que muda é a FILA (cada contexto vê a área dele) e a lista
     de tipos de problema, não a tela. */
  { key: 'tickets', label: 'Chamados', to: '/tickets', icon: LifeBuoy, contexts: EVERY_CONTEXT },
  /* Do parque de máquinas para baixo é tudo Infraestrutura: o inventário daqui é de
     computador, e a manutenção é a preventiva das máquinas. O inventário geral da Manutenção
     (mobiliário, mercadinho) é outro cadastro, e entra no contexto dela quando existir. */
  { key: 'computers', label: 'Inventário', to: '/computers', icon: HardDrive, contexts: ['infra'] },
  { key: 'maintenance', label: 'Manutenção', to: '/maintenance', icon: Wrench, contexts: ['infra'] },
  { key: 'parts', label: 'Depósito', to: '/parts', icon: Package, contexts: ['infra'] },
  /* O inventário da MANUTENÇÃO é outro cadastro: mobiliário, mercadinho, limpeza. O de
     Infraestrutura, logo acima, é o parque de computadores. */
  {
    key: 'inventory',
    label: 'Inventário',
    to: '/inventory',
    icon: PackageOpen,
    contexts: ['manutencao'],
  },
  { key: 'disposal', label: 'Descarte', to: '/disposal', icon: Trash2, contexts: ['infra'] },
  { key: 'network', label: 'Rede', to: '/network', icon: Wifi, contexts: ['infra'] },
  { key: 'insights', label: 'Inteligência', to: '/insights', icon: Lightbulb, contexts: ['infra'] },
  { key: 'budget', label: 'Orçamento', to: '/budget', icon: Wallet, contexts: ['infra'] },
  /* A feature de exemplo do template. Sai quando não servir mais de molde (skill
     `remove-example`) — ela não faz parte do sistema de TI. Fica em Infraestrutura, o contexto
     onde o sistema já existe, para não repetir em três menus um item que vai embora. */
  { key: 'tasks', label: 'Tarefas', to: '/tasks', icon: ListChecks, contexts: ['infra'] },
];

/** Os itens de menu de um contexto, na ordem da lista acima. */
export function navItemsForContext(
  context: RoleContext,
  items: readonly NavItem[] = NAV_ITEMS,
): NavItem[] {
  return items.filter((item) => item.contexts.includes(context));
}

/**
 * O item ativo pelo prefixo do caminho — o mais longo que casar vence, para `/tasks/archive`
 * acender "Arquivo" e não "Tarefas", se os dois existirem.
 */
export function activeNavKeyOf(
  pathname: string,
  items: readonly NavItem[] = NAV_ITEMS,
): string | undefined {
  return navItemOf(pathname, items)?.key;
}

/**
 * PARA QUAL CONTEXTO O SISTEMA DEVE IR — ou nada, quando o contexto atual já serve.
 *
 * Decide duas coisas de uma vez, nesta ordem:
 *
 *  1. **O contexto acompanha a tela.** Um link direto para o Depósito, colado no WhatsApp,
 *     abre com "Infraestrutura" aceso em cima — sem isto, a tela abriria com o contexto de
 *     ontem, num menu que não tem o item da tela aberta. Rota que existe no contexto atual
 *     (Chamados, por exemplo) não muda nada: trocar tiraria a pessoa de onde ela estava.
 *  2. **O contexto acompanha o cargo.** A preferência fica no navegador, mas o cargo muda (e
 *     a máquina pode ser de outra pessoa): abrir em "Manutenção" quem só atende
 *     Infraestrutura mostraria um menu de propósito nenhum.
 *
 * `available` é a lista de contextos em que a pessoa tem cargo. Vazia significa "ainda não
 * sei" (a consulta não voltou) ou "nenhum" — nos dois casos o cargo não restringe nada, e
 * quem manda é a tela aberta.
 */
export function reconciledContextOf(
  input: { pathname: string; current: RoleContext; available: readonly RoleContext[] },
  items: readonly NavItem[] = NAV_ITEMS,
): RoleContext | undefined {
  const { pathname, current, available } = input;
  const routeContext = contextOfRoute(pathname, current, items);

  if (routeContext && (available.length === 0 || available.includes(routeContext))) {
    return routeContext;
  }

  if (available.length > 0 && !available.includes(current)) return available[0];

  return undefined;
}

/** O contexto a que uma rota pertence, quando ela NÃO existe no contexto atual. */
function contextOfRoute(
  pathname: string,
  current: RoleContext,
  items: readonly NavItem[],
): RoleContext | undefined {
  const item = navItemOf(pathname, items);
  if (!item) return undefined;
  if (item.contexts.includes(current)) return undefined;

  return item.contexts[0];
}

/** O item de menu que responde por um caminho: o casamento mais específico. */
function navItemOf(pathname: string, items: readonly NavItem[]): NavItem | undefined {
  const matches = items.filter(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );

  return matches.sort((a, b) => b.to.length - a.to.length)[0];
}
