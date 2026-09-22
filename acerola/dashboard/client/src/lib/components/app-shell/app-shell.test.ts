import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BarChart3 from '@lucide/svelte/icons/chart-column';
import ListChecks from '@lucide/svelte/icons/list-checks';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import AppShell, { type AppShellProps } from './app-shell.svelte';

const items = [
  { key: 'tasks', label: 'Tarefas', to: '/tasks', icon: ListChecks },
  { key: 'reports', label: 'Relatórios', to: '/reports', icon: BarChart3 },
];

const content = createRawSnippet(() => ({
  render: () => '<div>Conteúdo da rota</div>',
}));

function renderShell(props: Omit<AppShellProps, 'children'>): ReturnType<typeof render> {
  return render(AppShell, { props: { ...props, children: content } });
}

describe('AppShell', () => {
  // feliz
  it('draws the content and the menu items', () => {
    renderShell({ ui: { items } });

    expect(screen.getByText('Conteúdo da rota')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tarefas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Relatórios' })).toBeInTheDocument();
  });

  it('shows the badge when the counter comes through data', () => {
    renderShell({ ui: { items }, data: { badges: { reports: 4 } } });

    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('shows who is using the system in the footer', () => {
    renderShell({ data: { user: { name: 'Ana Souza', email: 'a@b.c', role: 'Administrador' } } });

    expect(screen.getByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  // triste
  /* Zero não vira selo: um "0" ao lado de cada item seria ruído. */
  it('draws no badge for a zero counter', () => {
    renderShell({ ui: { items }, data: { badges: { reports: 0 } } });

    expect(screen.getByText('Conteúdo da rota')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('does not break without an identity', () => {
    renderShell({});

    expect(screen.getByText('Visitante')).toBeInTheDocument();
  });

  it('does nothing if "Sair" is clicked without an onLogout handler', async () => {
    renderShell({});

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));
  });
});

describe('AppShell logout', () => {
  // feliz
  it('calls onLogout when "Sair" is clicked', async () => {
    const onLogout = vi.fn();
    renderShell({ actions: { onLogout } });

    await userEvent.click(screen.getByRole('button', { name: 'Sair' }));

    expect(onLogout).toHaveBeenCalledOnce();
  });
});
