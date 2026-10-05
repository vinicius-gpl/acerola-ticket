import ListChecks from '@lucide/svelte/icons/list-checks';
import { ROLE_CONTEXTS } from '@template/shared/domain/role-context.util';
import { describe, expect, it } from 'vitest';

import {
  activeNavKeyOf,
  NAV_ITEMS,
  navItemsForContext,
  reconciledContextOf,
  type NavItem,
} from './navigation';

const items: NavItem[] = [
  { key: 'tasks', label: 'Tarefas', to: '/tasks', icon: ListChecks, contexts: ['infra'] },
  {
    key: 'archive',
    label: 'Arquivo',
    to: '/tasks/archive',
    icon: ListChecks,
    contexts: ['infra'],
  },
  {
    key: 'reports',
    label: 'Relatórios',
    to: '/reports',
    icon: ListChecks,
    contexts: ['manutencao'],
  },
  {
    key: 'tickets',
    label: 'Chamados',
    to: '/tickets',
    icon: ListChecks,
    contexts: ['infra', 'sistema', 'manutencao'],
  },
];

describe('activeNavKeyOf', () => {
  // feliz
  it('lights the item of the current route', () => {
    expect(activeNavKeyOf('/reports', items)).toBe('reports');
  });

  /* Abrir um registro não pode apagar a referência de onde a pessoa está. */
  it('keeps the item lit inside its subroutes', () => {
    expect(activeNavKeyOf('/tasks/42', items)).toBe('tasks');
  });

  it('prefers the most specific item when two match', () => {
    expect(activeNavKeyOf('/tasks/archive', items)).toBe('archive');
  });

  // triste
  it('does not light an item that only shares the beginning of the name', () => {
    expect(activeNavKeyOf('/tasksheet', items)).toBeUndefined();
  });

  it('lights nothing on a route that is not in the menu', () => {
    expect(activeNavKeyOf('/', items)).toBeUndefined();
  });
});

describe('navItemsForContext', () => {
  // feliz
  it('gives each context only its own screens', () => {
    expect(navItemsForContext('infra', items).map((item) => item.key)).toEqual([
      'tasks',
      'archive',
      'tickets',
    ]);
    expect(navItemsForContext('manutencao', items).map((item) => item.key)).toEqual([
      'reports',
      'tickets',
    ]);
  });

  /* Chamado existe nos três contextos — a fila é que muda, não o item do menu. */
  it('repeats the screens that belong to every context', () => {
    for (const context of ROLE_CONTEXTS) {
      expect(navItemsForContext(context, items).map((item) => item.key)).toContain('tickets');
    }
  });

  // triste
  /* Infraestrutura é o contexto com o sistema inteiro: Sistema é só chamado, por enquanto. */
  it('gives the leaner context a shorter menu', () => {
    expect(navItemsForContext('sistema', items).map((item) => item.key)).toEqual(['tickets']);
  });
});

describe('reconciledContextOf', () => {
  // feliz
  /* Link direto para uma tela de outro contexto leva o contexto junto. */
  it('moves to the context that owns the open screen', () => {
    const next = reconciledContextOf(
      { pathname: '/reports', current: 'infra', available: ROLE_CONTEXTS },
      items,
    );

    expect(next).toBe('manutencao');
  });

  it('moves to the first area of the person when the saved context is not hers', () => {
    const next = reconciledContextOf(
      { pathname: '/tickets', current: 'infra', available: ['manutencao'] },
      items,
    );

    expect(next).toBe('manutencao');
  });

  // triste
  it('changes nothing when the open screen exists in the current context', () => {
    const next = reconciledContextOf(
      { pathname: '/tickets', current: 'sistema', available: ROLE_CONTEXTS },
      items,
    );

    expect(next).toBeUndefined();
  });

  it('changes nothing on a screen that is in no menu, like the profile', () => {
    const next = reconciledContextOf(
      { pathname: '/profile', current: 'sistema', available: ROLE_CONTEXTS },
      items,
    );

    expect(next).toBeUndefined();
  });

  /* A tela aberta não pode levar a pessoa para um contexto em que ela não tem cargo: ela
     cairia num menu que não é dela, e com a fila de chamados vazia. */
  it('does not move to a context the person does not serve', () => {
    const next = reconciledContextOf(
      { pathname: '/reports', current: 'infra', available: ['infra', 'sistema'] },
      items,
    );

    expect(next).toBeUndefined();
  });

  /* Sem a lista de áreas (a consulta ainda não voltou) quem manda é a tela aberta. */
  it('still follows the open screen while the areas of the person are unknown', () => {
    const next = reconciledContextOf(
      { pathname: '/reports', current: 'infra', available: [] },
      items,
    );

    expect(next).toBe('manutencao');
  });
});

describe('NAV_ITEMS', () => {
  // feliz
  it('carries every area of the system, each with a label and a route', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label).toBeTruthy();
      expect(item.to.startsWith('/')).toBe(true);
      expect(item.icon).toBeTruthy();
    }
  });

  /* Chamado é o chão de qualquer contexto: sem ele, um contexto abriria sem menu nenhum. */
  it('gives every context at least the tickets queue', () => {
    for (const context of ROLE_CONTEXTS) {
      expect(navItemsForContext(context).map((item) => item.key)).toContain('tickets');
    }
  });

  /* O Painel é do parque de máquinas: ele não aparece onde não há máquina para resumir. */
  it('keeps the machine panel in infrastructure only', () => {
    expect(navItemsForContext('infra').map((item) => item.key)).toContain('dashboard');
    expect(navItemsForContext('sistema').map((item) => item.key)).not.toContain('dashboard');
    expect(navItemsForContext('manutencao').map((item) => item.key)).not.toContain('dashboard');
  });

  // triste
  /* Duas entradas com a mesma chave fariam o menu acender dois itens ao mesmo tempo. */
  it('has no repeated key', () => {
    const keys = NAV_ITEMS.map((item) => item.key);

    expect(new Set(keys).size).toBe(keys.length);
  });

  /* Duas entradas para a mesma rota são sempre engano: uma delas está morta. */
  it('has no repeated route', () => {
    const routes = NAV_ITEMS.map((item) => item.to);

    expect(new Set(routes).size).toBe(routes.length);
  });

  /* Item sem contexto nenhum não aparece em menu nenhum: a tela nasceria inalcançável. */
  it('has no item outside of every context', () => {
    for (const item of NAV_ITEMS) {
      expect(item.contexts.length).toBeGreaterThan(0);
      for (const context of item.contexts) {
        expect(ROLE_CONTEXTS).toContain(context);
      }
    }
  });

  it('lights exactly one item for the route of each entry', () => {
    for (const item of NAV_ITEMS) {
      expect(activeNavKeyOf(item.to)).toBe(item.key);
    }
  });
});
