import ListChecks from '@lucide/svelte/icons/list-checks';
import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';

import Harness from './app-shell-nav-entry-harness.test.svelte';

const item = { key: 'tasks', label: 'Tarefas', to: '/tasks', icon: ListChecks };

describe('AppShellNavEntry', () => {
  // feliz
  it('draws a link with the item label and address', () => {
    render(Harness, { props: { item } });

    const link = screen.getByRole('link', { name: 'Tarefas' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/tasks');
  });

  it('shows the counter when there is one', () => {
    render(Harness, { props: { item, badge: 4 } });

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  /* `data-active` é o que o shadcn usa para pintar o item aceso. */
  it('marks the entry as active', () => {
    render(Harness, { props: { item, isActive: true } });

    expect(screen.getByRole('link', { name: 'Tarefas' }).closest('[data-active]')).not.toBeNull();
  });

  // triste
  /* Um "0" ao lado de cada item do menu é ruído, não informação. */
  it('does not draw a badge for zero (edge case)', () => {
    render(Harness, { props: { item, badge: 0 } });

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('does not draw a badge when no counter comes through (edge case)', () => {
    const { container } = render(Harness, { props: { item } });

    expect(container.querySelector('[data-sidebar="menu-badge"]')).toBeNull();
  });
});
