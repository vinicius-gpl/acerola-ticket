import type React from 'react';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { type Meta, type StoryObj } from '@storybook/react';
import { BarChart3, ListChecks, Settings } from 'lucide-react';

import { AppShell } from './app-shell.component';

/**
 * `AppShell` desenha `<Link>` do TanStack Router, que exige um `RouterProvider` por perto.
 * Aqui a rota raiz É a própria story: não há navegação real, só o contexto que o `Link`
 * precisa para não estourar fora do app.
 */
function withRouter(Story: () => React.JSX.Element) {
  const router = createRouter({
    routeTree: createRootRoute({ component: Story }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return <RouterProvider router={router} />;
}

const manyItems = [
  { key: 'tasks', label: 'Tarefas', to: '/tasks', icon: ListChecks },
  { key: 'reports', label: 'Relatórios', to: '/reports', icon: BarChart3 },
  { key: 'settings', label: 'Configurações', to: '/settings', icon: Settings },
];

const meta = {
  title: 'Composers/AppShell',
  component: AppShell,
  decorators: [withRouter],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof AppShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: <div className="text-ink-700 p-8 text-sm">Conteúdo da rota entra aqui.</div>,
    data: { user: { name: 'Ana Souza', email: 'ana@empresa.com.br', role: 'Administrador' } },
    state: { activeKey: 'tasks' },
  },
};

/** Vários itens, com contador. Os contadores vêm prontos por `data` — a casca não busca nada. */
export const WithBadges: Story = {
  args: {
    ...Default.args,
    ui: { items: manyItems },
    data: { ...Default.args?.data, badges: { tasks: 3, reports: 12 } },
  },
};

/** Recolhida: os rótulos saem e sobra tela para o conteúdo. */
export const Collapsed: Story = {
  args: { ...WithBadges.args, state: { isCollapsed: true, activeKey: 'tasks' } },
};

/** Sem identidade: o rodapé não quebra. */
export const WithoutUser: Story = {
  args: { children: Default.args?.children },
};

/** Caso limite: conteúdo mais alto que a tela não deve empurrar o menu para fora. */
export const TallContent: Story = {
  args: {
    ...Default.args,
    children: (
      <div className="text-ink-700 space-y-4 p-8 text-sm">
        {Array.from({ length: 30 }, (_, index) => (
          <p key={index}>Linha de conteúdo {index + 1}, só para esticar a tela.</p>
        ))}
      </div>
    ),
  },
};
