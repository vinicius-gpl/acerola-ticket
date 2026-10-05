import ListChecks from '@lucide/svelte/icons/list-checks';
import { ROLE_CONTEXTS, type RoleContext } from '@template/shared/domain/role-context.util';
import { describe, expect, it } from 'vitest';

import {
  activeNavKeyOf,
  contextOfPath,
  contextPath,
  contextSwitchPath,
  fallbackContextOf,
  NAV_ITEMS,
  navItemsForContext,
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

const items: NavItem[] = [
  item('infra', 'tasks', 'Tarefas'),
  item('infra', 'tasks/archive', 'Arquivo'),
  item('infra', 'tickets', 'Chamados'),
  item('sistema', 'tickets', 'Chamados'),
  item('manutencao', 'tickets', 'Chamados'),
  item('manutencao', 'reports', 'Relatórios'),
];

describe('contextPath', () => {
  // feliz
  it('writes the address of a screen inside its context', () => {
    expect(contextPath('infra', '/tickets')).toBe('/infra/tickets');
    expect(contextPath('sistema', '/tickets')).toBe('/system/tickets');
    expect(contextPath('manutencao', '/inventory')).toBe('/maintenance/inventory');
  });

  // triste
  it('gives the root of the context when no screen is asked', () => {
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
  it('finds no context on a screen that belongs to none, like the profile', () => {
    expect(contextOfPath('/profile')).toBeUndefined();
    expect(contextOfPath('/')).toBeUndefined();
  });

  /* `/infrastructure` não é `/infra`: só o pedaço inteiro vale. */
  it('does not match a piece that only begins like a context', () => {
    expect(contextOfPath('/infrastructure/tickets')).toBeUndefined();
  });
});

describe('activeNavKeyOf', () => {
  // feliz
  it('lights the item of the current route', () => {
    expect(activeNavKeyOf('/maintenance/reports', items)).toBe('maintenance/reports');
  });

  /* Abrir um registro não pode apagar a referência de onde a pessoa está. */
  it('keeps the item lit inside its subroutes', () => {
    expect(activeNavKeyOf('/infra/tasks/42', items)).toBe('infra/tasks');
  });

  it('prefers the most specific item when two match', () => {
    expect(activeNavKeyOf('/infra/tasks/archive', items)).toBe('infra/tasks/archive');
  });

  /* Chamados existe nos três: o endereço é que diz qual dos três está aceso. */
  it('lights the item of the context in the address', () => {
    expect(activeNavKeyOf('/system/tickets/7', items)).toBe('system/tickets');
  });

  // triste
  it('does not light an item that only shares the beginning of the name', () => {
    expect(activeNavKeyOf('/infra/tasksheet', items)).toBeUndefined();
  });

  it('lights nothing on a route that is not in the menu', () => {
    expect(activeNavKeyOf('/', items)).toBeUndefined();
  });
});

describe('navItemsForContext', () => {
  // feliz
  it('gives each context only its own screens', () => {
    expect(navItemsForContext('infra', items).map((entry) => entry.feature)).toEqual([
      'tasks',
      'tasks/archive',
      'tickets',
    ]);
    expect(navItemsForContext('manutencao', items).map((entry) => entry.feature)).toEqual([
      'tickets',
      'reports',
    ]);
  });

  // triste
  /* Infraestrutura é o contexto com o sistema inteiro: Sistema é só chamado, por enquanto. */
  it('gives the leaner context a shorter menu', () => {
    expect(navItemsForContext('sistema', items).map((entry) => entry.feature)).toEqual(['tickets']);
  });
});

describe('contextSwitchPath', () => {
  // feliz
  it('keeps the person on the same screen when it exists in the new context', () => {
    expect(contextSwitchPath('/infra/tickets', 'manutencao', items)).toBe('/maintenance/tickets');
  });

  /* O chamado 42 da Infraestrutura não é o 42 da Manutenção: troca de contexto cai na lista. */
  it('goes to the list, not to the record that was open', () => {
    expect(contextSwitchPath('/infra/tickets/42', 'sistema', items)).toBe('/system/tickets');
  });

  // triste
  it('goes to the first screen of the new context when the open one does not exist there', () => {
    expect(contextSwitchPath('/infra/tasks', 'manutencao', items)).toBe('/maintenance/tickets');
  });

  it('goes nowhere when the new context has no screen at all', () => {
    expect(contextSwitchPath('/infra/tasks', 'sistema', [item('infra', 'tasks', 'Tarefas')])).toBe(
      undefined,
    );
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

describe('NAV_ITEMS', () => {
  // feliz
  it('carries every area of the system, each with a label and a route', () => {
    for (const entry of NAV_ITEMS) {
      expect(entry.label).toBeTruthy();
      expect(entry.icon).toBeTruthy();
    }
  });

  /* O endereço de cada tela começa pela pasta do contexto dela — é o que faz o link dizer de
     quem a tela é. */
  it('puts every screen under the address of its own context', () => {
    for (const entry of NAV_ITEMS) {
      expect(entry.to).toBe(contextPath(entry.context, `/${entry.feature}`));
      expect(contextOfPath(entry.to)).toBe(entry.context);
    }
  });

  /* Chamado é o chão de qualquer contexto: sem ele, um contexto abriria sem menu nenhum — e
     é para os Chamados que a raiz do sistema manda (ver `routes/+page.ts`). */
  it('gives every context at least the tickets queue', () => {
    for (const context of ROLE_CONTEXTS) {
      expect(navItemsForContext(context).map((entry) => entry.feature)).toContain('tickets');
    }
  });

  /* O Painel é do parque de máquinas: ele não aparece onde não há máquina para resumir. */
  it('keeps the machine panel in infrastructure only', () => {
    expect(navItemsForContext('infra').map((entry) => entry.feature)).toContain('dashboard');
    expect(navItemsForContext('sistema').map((entry) => entry.feature)).not.toContain('dashboard');
  });

  // triste
  /* Duas entradas com a mesma chave fariam o menu acender dois itens ao mesmo tempo. */
  it('has no repeated key', () => {
    const keys = NAV_ITEMS.map((entry) => entry.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  /* Duas entradas para a mesma rota são sempre engano: uma delas está morta. */
  it('has no repeated route', () => {
    const routes = NAV_ITEMS.map((entry) => entry.to);

    expect(new Set(routes).size).toBe(routes.length);
  });

  it('lights exactly one item for the route of each entry', () => {
    for (const entry of NAV_ITEMS) {
      expect(activeNavKeyOf(entry.to)).toBe(entry.key);
    }
  });
});
