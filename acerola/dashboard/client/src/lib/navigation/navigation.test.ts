import ListChecks from '@lucide/svelte/icons/list-checks';
import { describe, expect, it } from 'vitest';

import { activeNavKeyOf, NAV_ITEMS, type NavItem } from './navigation';

const items: NavItem[] = [
  { key: 'tasks', label: 'Tarefas', to: '/tasks', icon: ListChecks },
  { key: 'archive', label: 'Arquivo', to: '/tasks/archive', icon: ListChecks },
  { key: 'reports', label: 'Relatórios', to: '/reports', icon: ListChecks },
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

describe('NAV_ITEMS', () => {
  // feliz
  it('carries every area of the system, each with a label and a route', () => {
    for (const item of NAV_ITEMS) {
      expect(item.label).toBeTruthy();
      expect(item.to.startsWith('/')).toBe(true);
      expect(item.icon).toBeTruthy();
    }
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

  it('lights exactly one item for the route of each entry', () => {
    for (const item of NAV_ITEMS) {
      expect(activeNavKeyOf(item.to)).toBe(item.key);
    }
  });
});
