import ListChecks from '@lucide/svelte/icons/list-checks';
import { describe, expect, it } from 'vitest';

import { activeNavKeyOf, type NavItem } from './navigation';

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
