import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { BarChart3, ListChecks } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { AppShell, type AppShellProps } from './app-shell.component';

/**
 * `Link` exige um `RouterProvider` por perto (mesmo padrão da story). A resolução da rota é
 * assíncrona, então as consultas usam `findBy*`, que espera em vez de assumir que o conteúdo
 * já está no DOM no primeiro render.
 */
function renderShell(props: Omit<AppShellProps, 'children'>): ReturnType<typeof render> {
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <AppShell {...props}>
          <div>Conteúdo da rota</div>
        </AppShell>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

const items = [
  { key: 'tasks', label: 'Tarefas', to: '/tasks', icon: ListChecks },
  { key: 'reports', label: 'Relatórios', to: '/reports', icon: BarChart3 },
];

describe('AppShell', () => {
  // feliz
  it('draws the content and the menu items', async () => {
    renderShell({ ui: { items } });

    expect(await screen.findByText('Conteúdo da rota')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Tarefas' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Relatórios' })).toBeInTheDocument();
  });

  it('shows the badge when the counter comes through data', async () => {
    renderShell({ ui: { items }, data: { badges: { reports: 4 } } });

    expect(await screen.findByText('4')).toBeInTheDocument();
  });

  it('shows who is using the system in the footer', async () => {
    renderShell({ data: { user: { name: 'Ana Souza', email: 'a@b.c', role: 'Administrador' } } });

    expect(await screen.findByText('Ana Souza')).toBeInTheDocument();
    expect(screen.getByText('Administrador')).toBeInTheDocument();
  });

  // triste
  /* Zero não vira selo: um "0" ao lado de cada item seria ruído. */
  it('draws no badge for a zero counter', async () => {
    renderShell({ ui: { items }, data: { badges: { reports: 0 } } });

    await screen.findByText('Conteúdo da rota');
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('does not break without an identity', async () => {
    renderShell({});

    expect(await screen.findByText('Visitante')).toBeInTheDocument();
  });
});
