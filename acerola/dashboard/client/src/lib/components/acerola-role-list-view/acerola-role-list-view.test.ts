import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RoleListView, { type AcerolaRoleListViewProps } from './acerola-role-list-view.svelte';

const mockRoles: InternalRole[] = [
  {
    id: 1,
    userId: 'usr_1',
    userEmail: 'vinicius@empresa.com.br',
    context: 'infra',
    role: 'user',
    createdAt: '2026-10-01T12:00:00.000Z',
    createdBy: 'admin@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
  },
  {
    id: 2,
    userId: 'usr_1',
    userEmail: 'vinicius@empresa.com.br',
    context: 'sistema',
    role: 'admin',
    createdAt: '2026-10-01T12:00:00.000Z',
    createdBy: 'admin@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
  },
];

function renderView(overrides: Partial<AcerolaRoleListViewProps> = {}) {
  const actions = {
    onCreate: vi.fn(),
    onEdit: vi.fn(),
    onAskDelete: vi.fn(),
    onSearchChange: vi.fn(),
    onContextChange: vi.fn(),
    onClearFilters: vi.fn(),
    onRetry: vi.fn(),
  };

  render(RoleListView, {
    props: {
      data: { roles: mockRoles, total: 2, filter: { search: '', context: '' } },
      state: { isLoading: false, isEmpty: false, isFilteredOut: false, error: null },
      actions,
      ...overrides,
    },
  });

  return actions;
}

describe('AcerolaRoleListView', () => {
  // feliz
  it('renders the header and list of roles', () => {
    renderView({
      data: {
        currentUser: {
          name: 'Vinícius Gabriel',
          email: 'vinicius@empresa.com.br',
          role: 'admin',
          roles: { sistema: 'admin', infra: 'user', manutencao: 'manager' },
        },
        roles: mockRoles,
        total: 2,
        filter: { search: '', context: '' },
      },
    });

    expect(screen.getByRole('heading', { name: 'Cargos e Perfis da Equipe' })).toBeInTheDocument();
    expect(screen.getByText('Vinícius Gabriel')).toBeInTheDocument();
    expect(screen.getAllByText('vinicius@empresa.com.br').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Infraestrutura').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sistema').length).toBeGreaterThanOrEqual(1);
  });

  it('triggers onCreate when clicking Atribuir cargo', async () => {
    const actions = renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Atribuir cargo' }));
    expect(actions.onCreate).toHaveBeenCalledOnce();
  });

  it('triggers onEdit when clicking Editar', async () => {
    const actions = renderView();

    const editButtons = screen.getAllByRole('button', { name: 'Editar' });
    await userEvent.click(editButtons[0]!);
    expect(actions.onEdit).toHaveBeenCalledWith(mockRoles[0]);
  });

  it('triggers onAskDelete when clicking Excluir', async () => {
    const actions = renderView();

    const deleteButtons = screen.getAllByRole('button', { name: 'Excluir' });
    await userEvent.click(deleteButtons[0]!);
    expect(actions.onAskDelete).toHaveBeenCalledWith(mockRoles[0]);
  });

  it('shows read-only banner and hides manage buttons for non-superadmin users', () => {
    renderView({
      data: {
        currentUser: {
          name: 'Operador',
          email: 'op@empresa.com.br',
          role: 'admin',
        },
        roles: mockRoles,
        total: 2,
        filter: { search: '', context: '' },
      },
    });

    expect(screen.getByText(/Modo de visualização da equipe/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Atribuir cargo' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
  });

  // triste
  it('renders empty state when there are no roles', () => {
    renderView({
      data: { roles: [], total: 0, filter: { search: '', context: '' } },
      state: { isLoading: false, isEmpty: true, isFilteredOut: false, error: null },
    });

    expect(screen.getByText('Nenhum cargo interno atribuído')).toBeInTheDocument();
  });

  it('renders error state when error is provided', () => {
    renderView({
      state: {
        isLoading: false,
        isEmpty: false,
        isFilteredOut: false,
        error: 'Erro de permissão',
      },
    });

    expect(screen.getByText('Erro ao carregar cargos da equipe')).toBeInTheDocument();
  });

  it('renders both mobile cards and desktop table for responsive design', () => {
    const { container } = render(RoleListView, {
      props: {
        data: {
          roles: mockRoles,
          total: 2,
          filter: { search: '', context: '' },
          users: [
            {
              id: 'usr_1',
              name: 'Vinícius Gabriel',
              email: 'vinicius@empresa.com.br',
              role: 'superadmin',
            },
          ],
        },
        state: { isLoading: false, isEmpty: false, isFilteredOut: false, error: null },
        actions: {
          onCreate: vi.fn(),
          onEdit: vi.fn(),
          onAskDelete: vi.fn(),
          onSearchChange: vi.fn(),
          onContextChange: vi.fn(),
          onClearFilters: vi.fn(),
          onRetry: vi.fn(),
        },
      },
    });

    const mobileCards = container.querySelector('[data-slot="role-cards-mobile"]');
    const desktopTable = container.querySelector('[data-slot="role-table-desktop"]');

    expect(mobileCards).toBeInTheDocument();
    expect(desktopTable).toBeInTheDocument();
    expect(mobileCards?.classList.contains('xl:hidden')).toBe(true);
    expect(desktopTable?.classList.contains('hidden')).toBe(true);
    expect(desktopTable?.classList.contains('xl:block')).toBe(true);
  });
});
