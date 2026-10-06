import ListChecks from '@lucide/svelte/icons/list-checks';
import { ROLE_CONTEXTS, type RoleContext } from '@template/shared/domain/role-context.util';
import { describe, expect, it } from 'vitest';

import {
  activeNavKeyOf,
  contextOfPath,
  contextPath,
  contextSwitchPath,
  fallbackContextOf,
  INFRA_NAV_ITEMS,
  MAINTENANCE_NAV_ITEMS,
  NAV_ITEMS_BY_CONTEXT,
  SYSTEM_NAV_ITEMS,
  type NavItem,
} from './navigation';

function item(context: RoleContext, feature: string, label: string): NavItem {
  return {
    key: `${contextPath(context).slice(1)}/${feature}`,
    label,
    to: contextPath(context, `/${feature}`),
    icon: ListChecks,
    context,
    feature,
  };
}

/** Três menus de mentira, no mesmo formato do real: um por módulo, nada compartilhado. */
const byContext: Record<RoleContext, readonly NavItem[]> = {
  infra: [
    item('infra', 'tasks', 'Tarefas'),
    item('infra', 'tasks/archive', 'Arquivo'),
    item('infra', 'tickets', 'Chamados'),
  ],
  sistema: [item('sistema', 'tickets', 'Chamados')],
  manutencao: [item('manutencao', 'tickets', 'Chamados'), item('manutencao', 'reports', 'Relatórios')],
};

/** Todos os itens de verdade, de uma vez — só para conferir o que vale para o menu inteiro. */
const allItems: NavItem[] = ROLE_CONTEXTS.flatMap((context) => [...NAV_ITEMS_BY_CONTEXT[context]]);

describe('contextPath', () => {
  // feliz
  it('writes the address of a screen inside its context', () => {
    expect(contextPath('infra', '/tickets')).toBe('/infra/tickets');
    expect(contextPath('sistema', '/tickets')).toBe('/system/tickets');
    expect(contextPath('manutencao', '/inventory')).toBe('/maintenance/inventory');
  });

  // triste
  it('writes only the folder of the context when no screen is asked', () => {
    expect(contextPath('manutencao')).toBe('/maintenance');
  });
});

describe('contextOfPath', () => {
  // feliz
  it('reads the context from the first piece of the address', () => {
    expect(contextOfPath('/infra/computers/12')).toBe('infra');
    expect(contextOfPath('/system/tickets')).toBe('sistema');
    expect(contextOfPath('/maintenance')).toBe('manutencao');
  });

  // triste
  it('gives nothing on a screen that belongs to no context', () => {
    expect(contextOfPath('/profile')).toBeUndefined();
    expect(contextOfPath('/')).toBeUndefined();
  });

  it('gives nothing when the folder only looks like a context', () => {
    expect(contextOfPath('/infrastructure/tickets')).toBeUndefined();
  });
});

describe('activeNavKeyOf', () => {
  // feliz
  it('lights the item of the current route', () => {
    expect(activeNavKeyOf('/maintenance/reports', byContext.manutencao)).toBe(
      'maintenance/reports',
    );
  });

  /* Abrir um registro não pode apagar a referência de onde a pessoa está. */
  it('keeps the item lit inside its subroutes', () => {
    expect(activeNavKeyOf('/infra/tasks/42', byContext.infra)).toBe('infra/tasks');
  });

  it('prefers the most specific item when two match', () => {
    expect(activeNavKeyOf('/infra/tasks/archive', byContext.infra)).toBe('infra/tasks/archive');
  });

  /* Chamados existe nos três: quem acende é o menu DO MÓDULO que recebeu o endereço. */
  it('lights the item of the context that owns the screen', () => {
    expect(activeNavKeyOf('/system/tickets/7', byContext.sistema)).toBe('system/tickets');
  });

  // triste
  it('does not light an item that only shares the beginning of the name', () => {
    expect(activeNavKeyOf('/infra/tasksheet', byContext.infra)).toBeUndefined();
  });

  it('lights nothing on a route that is not in the menu', () => {
    expect(activeNavKeyOf('/', byContext.infra)).toBeUndefined();
  });

  /* A TRAVA DA CASCA: o menu de um módulo não acende por endereço de outro. É o que impede a
     casca da Infraestrutura de parecer dona de `/maintenance`. */
  it('lights nothing when the address belongs to another module', () => {
    expect(activeNavKeyOf('/maintenance/tickets', byContext.infra)).toBeUndefined();
    expect(activeNavKeyOf('/infra/tickets', byContext.manutencao)).toBeUndefined();
  });
});

describe('contextSwitchPath', () => {
  // feliz
  it('keeps the person on the same screen when it exists in the new context', () => {
    expect(contextSwitchPath('/infra/tickets', 'manutencao', byContext)).toBe(
      '/maintenance/tickets',
    );
  });

  /* O chamado 42 da Infraestrutura não é o 42 da Manutenção: troca de contexto cai na lista. */
  it('goes to the list, not to the record that was open', () => {
    expect(contextSwitchPath('/infra/tickets/42', 'sistema', byContext)).toBe('/system/tickets');
  });

  // triste
  it('goes to the first screen of the new context when the open one does not exist there', () => {
    expect(contextSwitchPath('/infra/tasks', 'manutencao', byContext)).toBe(
      '/maintenance/tickets',
    );
  });

  it('goes nowhere when the new context has no screen at all', () => {
    expect(
      contextSwitchPath('/infra/tasks', 'sistema', { ...byContext, sistema: [] }),
    ).toBeUndefined();
  });

  /* Vindo do perfil (que não é de contexto nenhum) não há tela para manter: cai na primeira. */
  it('goes to the first screen when coming from a screen without context', () => {
    expect(contextSwitchPath('/profile', 'manutencao', byContext)).toBe('/maintenance/tickets');
  });
});

describe('fallbackContextOf', () => {
  // feliz
  it('moves to the first area of the person when the asked context is not hers', () => {
    expect(fallbackContextOf('infra', ['manutencao', 'sistema'])).toBe('manutencao');
  });

  // triste
  it('changes nothing when the person serves the asked context', () => {
    expect(fallbackContextOf('sistema', ROLE_CONTEXTS)).toBeUndefined();
  });

  /* Sem a lista de áreas (a consulta ainda não voltou) o cargo não restringe nada. */
  it('changes nothing while the areas of the person are unknown', () => {
    expect(fallbackContextOf('manutencao', [])).toBeUndefined();
  });
});

describe('os menus dos módulos', () => {
  // feliz
  it('carries every entry with a label and an icon', () => {
    for (const entry of allItems) {
      expect(entry.label).toBeTruthy();
      expect(entry.icon).toBeTruthy();
    }
  });

  /* O endereço de cada tela começa pela pasta do módulo dela — é o que faz o link dizer de
     quem a tela é. */
  it('puts every screen under the address of its own module', () => {
    for (const entry of allItems) {
      expect(entry.to).toBe(contextPath(entry.context, `/${entry.feature}`));
      expect(contextOfPath(entry.to)).toBe(entry.context);
    }
  });

  /* A GARANTIA DA SEPARAÇÃO: a lista de um módulo não carrega tela de outro. Cada casca
     importa só a sua, então basta isto para um menu nunca mostrar o que não é dele. */
  it('keeps each list free of screens from another module', () => {
    for (const context of ROLE_CONTEXTS) {
      for (const entry of NAV_ITEMS_BY_CONTEXT[context]) {
        expect(entry.context).toBe(context);
        expect(contextOfPath(entry.to)).toBe(context);
      }
    }
  });

  /* Chamado é o chão de qualquer módulo: sem ele, um contexto abriria sem menu nenhum — e é
     para os Chamados que a raiz do sistema manda (ver `routes/+page.ts`). */
  it('gives every module at least the tickets queue', () => {
    for (const context of ROLE_CONTEXTS) {
      expect(NAV_ITEMS_BY_CONTEXT[context].map((entry) => entry.feature)).toContain('tickets');
    }
  });

  /* Cada painel é do módulo dele, com endereço próprio: o de Infraestrutura resume máquinas,
     o da Manutenção resume depósito e orçamentos. Sistema ainda não tem painel. */
  it('gives a panel of its own to each module that has one', () => {
    const panelOf = (context: RoleContext) =>
      NAV_ITEMS_BY_CONTEXT[context].find((entry) => entry.feature === 'dashboard')?.to;

    expect(panelOf('infra')).toBe('/infra/dashboard');
    expect(panelOf('manutencao')).toBe('/maintenance/dashboard');
    expect(panelOf('sistema')).toBeUndefined();
  });

  /* O que a Manutenção pediu: painel, depósito, descarte e orçamentos, além do inventário. */
  it('carries the whole menu of Maintenance, in the order of the work', () => {
    expect(MAINTENANCE_NAV_ITEMS.map((entry) => entry.feature)).toEqual([
      'dashboard',
      'tickets',
      'inventory',
      'stock',
      'disposal',
      'quotes',
    ]);
  });

  /* Infraestrutura é o módulo com o sistema inteiro; Sistema é só chamado, por enquanto. */
  it('gives the leaner module a shorter menu', () => {
    expect(SYSTEM_NAV_ITEMS.map((entry) => entry.feature)).toEqual(['tickets']);
    expect(INFRA_NAV_ITEMS.length).toBeGreaterThan(SYSTEM_NAV_ITEMS.length);
  });

  // triste
  /* Duas entradas com a mesma chave fariam o menu acender dois itens ao mesmo tempo. */
  it('has no repeated key', () => {
    const keys = allItems.map((entry) => entry.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  /* Duas entradas para a mesma rota são sempre engano: uma delas está morta. */
  it('has no repeated route', () => {
    const routes = allItems.map((entry) => entry.to);

    expect(new Set(routes).size).toBe(routes.length);
  });

  it('lights exactly one item for the route of each entry', () => {
    for (const context of ROLE_CONTEXTS) {
      for (const entry of NAV_ITEMS_BY_CONTEXT[context]) {
        expect(activeNavKeyOf(entry.to, NAV_ITEMS_BY_CONTEXT[context])).toBe(entry.key);
      }
    }
  });
});
