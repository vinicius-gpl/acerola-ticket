import type { LucideIcon } from '@lucide/svelte';
import FileText from '@lucide/svelte/icons/file-text';
import HardDrive from '@lucide/svelte/icons/hard-drive';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
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
 * O MENU LATERAL — UMA LISTA POR MÓDULO.
 *
 * São três sistemas dentro de um — Infraestrutura, Sistema e Manutenção —, cada um com a
 * própria pasta em `src/routes/(app)` (`/infra/...`, `/system/...`, `/maintenance/...`) e com
 * a PRÓPRIA CASCA: cada `+layout.svelte` de contexto importa só a lista dele e monta o seu
 * menu. Nenhum módulo enxerga a lista do outro.
 *
 * Antes existia uma lista única, com o contexto como campo, e a casca a FILTRAVA em tempo de
 * execução a partir do contexto guardado no navegador. Era por aí que um módulo se achava
 * dono do sistema inteiro: a lista sabia das três áreas, e bastava o filtro falhar (ou nem
 * ser aplicado) para o menu de um aparecer no outro. Agora não há filtro: a pasta é o filtro.
 *
 * Tela nova no menu = uma linha na lista do módulo dono.
 *
 * `to` é a rota do SvelteKit (a pasta em `src/routes/(app)`). O item fica aceso também nas
 * subrotas: `/infra/tickets/42` acende "Chamados".
 *
 * A ORDEM É A DO TRABALHO, não a da construção: começa no que a pessoa olha de manhã
 * (Painel, Chamados), passa pelo que ela cuida (Inventário, Manutenção, Depósito, Descarte),
 * e termina no que serve para decidir compra (Inteligência, Orçamento).
 */
export type NavItem = {
  /** Única no menu inteiro: é o endereço sem a barra inicial (`infra/tickets`). */
  key: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** O módulo dono da tela. */
  context: RoleContext;
  /**
   * A tela dentro do módulo (`tickets`). É o que deixa trocar de contexto sem sair do
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

/**
 * INFRAESTRUTURA — o parque de máquinas. O Painel daqui resume máquinas e os chamados DA
 * INFRA; o painel de outro módulo é outra tela, na pasta dele.
 */
export const INFRA_NAV_ITEMS: readonly NavItem[] = [
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
];

/** SISTEMA — os sistemas da empresa e os chamados deles. */
export const SYSTEM_NAV_ITEMS: readonly NavItem[] = [
  navItem('sistema', 'tickets', 'Chamados', LifeBuoy),
];

/**
 * MANUTENÇÃO — o prédio e o dia a dia do escritório. Os nomes repetem os de Infraestrutura
 * (Painel, Inventário, Depósito, Descarte) porque o trabalho é o mesmo, mas cada um é OUTRA
 * tela, com outro cadastro: aqui é mobiliário, mercadinho e limpeza, não computador. Os
 * Orçamentos daqui guardam o que foi cotado com empresas de fora — não são a sugestão de
 * compra de máquina que Infraestrutura tem.
 */
export const MAINTENANCE_NAV_ITEMS: readonly NavItem[] = [
  navItem('manutencao', 'dashboard', 'Painel', LayoutDashboard),
  navItem('manutencao', 'tickets', 'Chamados', LifeBuoy),
  navItem('manutencao', 'inventory', 'Inventário', PackageOpen),
  navItem('manutencao', 'stock', 'Depósito', Package),
  navItem('manutencao', 'disposal', 'Descarte', Trash2),
  navItem('manutencao', 'quotes', 'Orçamentos', FileText),
];

/**
 * O MAPA DOS TRÊS — e o único lugar do sistema que conhece os três menus.
 *
 * Serve a duas coisas que são, por natureza, de fora dos módulos: o SELETOR de contexto no
 * cabeçalho (que precisa saber para qual endereço ir) e a casca das telas que não são de
 * contexto nenhum (o perfil, os cargos), que mostra o menu do último contexto usado.
 *
 * Nenhuma tela de módulo importa isto: a casca de cada contexto importa a lista dele.
 */
export const NAV_ITEMS_BY_CONTEXT: Record<RoleContext, readonly NavItem[]> = {
  infra: INFRA_NAV_ITEMS,
  sistema: SYSTEM_NAV_ITEMS,
  manutencao: MAINTENANCE_NAV_ITEMS,
};

/**
 * O item aceso, DENTRO DOS ITENS QUE A CASCA RECEBEU — o prefixo mais longo que casar vence,
 * para `/infra/tasks/archive` acender "Arquivo" e não "Tarefas", se os dois existirem.
 *
 * `items` é obrigatório de propósito: com um padrão que conhecesse as três listas, a casca de
 * um módulo poderia acender o item de outro.
 */
export function activeNavKeyOf(pathname: string, items: readonly NavItem[]): string | undefined {
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
  byContext: Record<RoleContext, readonly NavItem[]> = NAV_ITEMS_BY_CONTEXT,
): string | undefined {
  const target = byContext[context];
  const from = contextOfPath(pathname);
  const current = from ? navItemOf(pathname, byContext[from]) : undefined;
  const same = target.find((item) => item.feature === current?.feature);

  return (same ?? target[0])?.to;
}

/**
 * O CONTEXTO DA PESSOA, quando o módulo não é dela — ou nada, quando é.
 *
 * O endereço diz o módulo, mas quem atende só Manutenção não tem o que fazer em `/infra`:
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
  const matches = items.filter((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));

  return matches.sort((a, b) => b.to.length - a.to.length)[0];
}
