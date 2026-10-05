import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import BarChart3 from '@lucide/svelte/icons/chart-column';
import ListChecks from '@lucide/svelte/icons/list-checks';
import { createRawSnippet } from 'svelte';
import { describe, expect, it, vi } from 'vitest';

import AppShell, { type AcerolaAppShellProps } from './acerola-app-shell.svelte';

const items = [
  { key: 'tasks', label: 'Tarefas', to: '/tasks', icon: ListChecks, contexts: ['infra'] },
  { key: 'reports', label: 'Relatórios', to: '/reports', icon: BarChart3, contexts: ['infra'] },
] as const;

const content = createRawSnippet(() => ({
  render: () => '<div>Conteúdo da rota</div>',
}));

function renderShell(props: Omit<AcerolaAppShellProps, 'children'>): ReturnType<typeof render> {
  return render(AppShell, { props: { ...props, children: content } });
}

describe('AcerolaAppShell', () => {
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

  /* O contexto fica À VISTA, em pastilhas no cabeçalho: a pessoa vê em qual área está e troca
     com um clique, sem abrir lista nenhuma. */
  it('shows the area contexts as pills and asks to switch on a click', async () => {
    const onAreaContextChange = vi.fn();
    renderShell({
      data: {
        areaOptions: [
          { value: 'infra', label: 'Infraestrutura' },
          { value: 'sistema', label: 'Sistema' },
          { value: 'manutencao', label: 'Manutenção' },
        ],
      },
      state: { areaContext: 'infra' },
      actions: { onAreaContextChange },
    });

    const group = screen.getByRole('group', { name: 'Área que você está vendo' });
    expect(within(group).getAllByRole('button')).toHaveLength(3);

    await userEvent.click(within(group).getByRole('button', { name: 'Manutenção' }));

    expect(onAreaContextChange).toHaveBeenCalledWith('manutencao');
  });

  /* Cada contexto tem um desenho na frente do texto: a pessoa acha a área pelo formato. */
  it('draws the icon of each context next to its name', () => {
    renderShell({
      data: {
        areaOptions: [
          { value: 'manutencao', label: 'Manutenção', icon: ListChecks },
          { value: 'infra', label: 'Infraestrutura', icon: BarChart3 },
          { value: 'sistema', label: 'Sistema' },
        ],
      },
      state: { areaContext: 'manutencao' },
    });

    const group = screen.getByRole('group', { name: 'Área que você está vendo' });

    expect(
      within(group).getByRole('button', { name: 'Manutenção' }).querySelector('svg'),
    ).not.toBeNull();
    expect(within(group).getByRole('button', { name: 'Infraestrutura' }).querySelector('svg')).not.toBeNull();
    /* Opção sem ícone continua valendo: só o texto. */
    expect(within(group).getByRole('button', { name: 'Sistema' }).querySelector('svg')).toBeNull();
    /* A lista suspensa das telas estreitas mostra o ícone da área atual também. */
    expect(
      screen.getByRole('combobox', { name: 'Área que você está vendo' }).querySelector('svg'),
    ).not.toBeNull();
  });

  /* No tablet e no celular as pastilhas não cabem: o mesmo contexto vira uma lista suspensa,
     que mostra a área atual. Os dois desenhos existem na tela; o CSS mostra um por largura. */
  it('offers the same context as a compact list for narrow screens', () => {
    renderShell({
      data: {
        areaOptions: [
          { value: 'sistema', label: 'Sistema' },
          { value: 'infra', label: 'Infraestrutura' },
        ],
      },
      state: { areaContext: 'infra' },
    });

    const list = screen.getByRole('combobox', { name: 'Área que você está vendo' });

    expect(list).toHaveTextContent('Infraestrutura');
    expect(list.className).toContain('lg:hidden');
    expect(screen.getByRole('group', { name: 'Área que você está vendo' }).className).toContain('hidden');
  });

  // triste
  /* Quem atende uma área só (ou nenhuma) não tem o que escolher: o seletor nem aparece. */
  it('draws no context selector when there is nothing to choose', () => {
    renderShell({ data: { areaOptions: [] } });

    expect(screen.queryByRole('group', { name: 'Área que você está vendo' })).not.toBeInTheDocument();
  });

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
