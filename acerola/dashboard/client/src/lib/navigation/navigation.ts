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
 * O CONTEXTO MORA NO ENDEREÇO. São três sistemas dentro de um — Infraestrutura, Sistema e
 * Manutenção — e cada um tem a própria pasta em `src/routes/(app)`: `/infra/...`,
 * `/system/...` e `/maintenance/...`. Antes o contexto era só uma preferência guardada no
 * navegador, e o endereço não dizia de quem a tela era: `/tickets` abria a fila da área que
 * estivesse salva em quem clicou no link, e "Inventário", "Depósito" e "Orçamento" de áreas
 * diferentes disputavam o mesmo nome de rota.
 *
 * Cada item pertence a UM contexto. O que existe em mais de um (Chamados) é uma linha por
 * contexto, porque é uma tela por contexto — a fila, os tipos de problema e o que vier depois
 * mudam de uma área para a outra.
 *
 * `to` é a rota do SvelteKit (a pasta em `src/routes/(app)`). O item fica aceso também nas
 * subrotas: `/infra/tickets/42` acende "Chamados".
 *
 * A ORDEM É A DO TRABALHO, não a da construção: começa no que a pessoa olha de manhã
 * (Painel, Chamados), passa pelo parque de máquinas (Inventário, Manutenção, Depósito,
 * Descarte), pela rede, e termina no que serve para decidir compra (Inteligência, Orçamento).
 */
export type NavItem = {
  /** Única no menu inteiro: é o endereço sem a barra inicial (`infra/tickets`). */
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** O contexto dono da tela. */
  context: RoleContext;
  /**
   * A tela dentro do contexto (`tickets`). É o que deixa trocar de contexto sem sair do
   * assunto: quem está nos Chamados da Infraestrutura cai nos Chamados da Manutenção.
   */
  feature: string;
};

/**
 * O pedaço do endereço de cada contexto. Em inglês, como toda rota (CONTRIBUTING §1) — o
 * valor do contexto (`manutencao`) é dado do banco, e não muda por causa disto.
 */
export const CONTEXT_SEGMENTS: Record<RoleContext, string> = {
  infra: 'infra',
  sistema: 'system',
  manutencao: 'maintenance',
};

/** O endereço de uma tela dentro de um contexto: `contextPath('infra', '/tickets')`. */
export function contextPath(context: RoleContext, path = ''): string {
  return `/${CONTEXT_SEGMENTS[context]}${path}`;
}

/** O contexto de um endereço — ou nada, na tela que não é de contexto nenhum (o perfil). */
export function contextOfPath(pathname: string): RoleContext | undefined {
  const segment = pathname.split('/')[1];

  return ROLE_CONTEXTS.find((context) => CONTEXT_SEGMENTS[context] === segment);
}

function navItem(context: RoleContext, feature: string, label: string, icon: LucideIcon): NavItem {
  return {
    key: `${CONTEXT_SEGMENTS[context]}/${feature}`,
    label,
    to: contextPath(context, `/${feature}`),
    icon,
    context,
    feature,
  };
}

export const NAV_ITEMS: NavItem[] = [
  /* INFRAESTRUTURA — o parque de máquinas. O Painel daqui resume máquinas (quantas, quanto de
     memória, o que manter); o painel de outro contexto é outra tela, na pasta dele. */
  navItem('infra', 'dashboard', 'Painel', Monitor),
  navItem('infra', 'tickets', 'Chamados', LifeBuoy),
  navItem('infra', 'computers', 'Inventário', HardDrive),
  navItem('infra', 'maintenance', 'Manutenção', Wrench),
  navItem('infra', 'parts', 'Depósito', Package),
  navItem('infra', 'disposal', 'Descarte', Trash2),
  navItem('infra', 'network', 'Rede', Wifi),
  navItem('infra', 'insights', 'Inteligência', Lightbulb),
  navItem('infra', 'budget', 'Orçamento', Wallet),
  /* A feature de exemplo do template. Sai quando não servir mais de molde (skill
     `remove-example`) — ela não faz parte do sistema de TI. */
  navItem('infra', 'tasks', 'Tarefas', ListChecks),

  /* SISTEMA — só chamado (e, mais adiante, a ponte com o GitHub). */
  navItem('sistema', 'tickets', 'Chamados', LifeBuoy),

  /* MANUTENÇÃO — o inventário daqui é outro cadastro: mobiliário, mercadinho, limpeza. */
  navItem('manutencao', 'tickets', 'Chamados', LifeBuoy),
  navItem('manutencao', 'inventory', 'Inventário', PackageOpen),
];

/** Os itens de menu de um contexto, na ordem da lista acima. */
export function navItemsForContext(
  context: RoleContext,
  items: readonly NavItem[] = NAV_ITEMS,
): NavItem[] {
  return items.filter((item) => item.context === context);
}

/**
 * O item ativo pelo prefixo do caminho — o mais longo que casar vence, para
 * `/infra/tasks/archive` acender "Arquivo" e não "Tarefas", se os dois existirem.
 */
export function activeNavKeyOf(
  pathname: string,
  items: readonly NavItem[] = NAV_ITEMS,
): string | undefined {
  return navItemOf(pathname, items)?.key;
}

/**
 * ONDE A PESSOA CAI AO TROCAR DE CONTEXTO.
 *
 * Na mesma tela do contexto novo, quando ela existe lá (Chamados existe nos três) — e sempre
 * na LISTA, nunca no registro aberto: o chamado 42 da Infraestrutura não é o 42 da Manutenção.
 * Quando a tela não existe no contexto novo (o Depósito de máquinas), na primeira tela dele.
 */
export function contextSwitchPath(
  pathname: string,
  context: RoleContext,
  items: readonly NavItem[] = NAV_ITEMS,
): string | undefined {
  const target = navItemsForContext(context, items);
  const current = navItemOf(pathname, items);
  const same = target.find((item) => item.feature === current?.feature);

  return (same ?? target[0])?.to;
}

/**
 * O CONTEXTO DA PESSOA, quando o pedido não é dela — ou nada, quando o pedido serve.
 *
 * O endereço diz o contexto, mas quem atende só Manutenção não tem o que fazer em `/infra`:
 * abriria um menu que não é dela, com a fila de chamados vazia. `available` é a lista de
 * contextos em que a pessoa tem cargo. Vazia significa "ainda não sei" (a consulta não
 * voltou) ou "nenhum" — nos dois casos o cargo não restringe nada.
 */
export function fallbackContextOf(
  wanted: RoleContext,
  available: readonly RoleContext[],
): RoleContext | undefined {
  if (available.length === 0) return undefined;
  if (available.includes(wanted)) return undefined;

  return available[0];
}

/** O item de menu que responde por um caminho: o casamento mais específico. */
function navItemOf(pathname: string, items: readonly NavItem[]): NavItem | undefined {
  const matches = items.filter(
    (item) => pathname === item.to || pathname.startsWith(`${item.to}/`),
  );

  return matches.sort((a, b) => b.to.length - a.to.length)[0];
}
