import { type InternalRole } from '@template/shared/schemas/internal-role.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RoleListView, { type RoleListViewProps } from './role-list-view.svelte';

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

function renderView(overrides: Partial<RoleListViewProps> = {}) {
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

describe('RoleListView', () => {
  // feliz
  it('renders the header and list of roles', () => {
    renderView();

    expect(screen.getByRole('heading', { name: 'Cargos Internos' })).toBeInTheDocument();
    expect(screen.getAllByText('vinicius@empresa.com.br')).toHaveLength(2);
    expect(screen.getByText('Infraestrutura')).toBeInTheDocument();
    expect(screen.getByText('Sistema')).toBeInTheDocument();
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

    expect(screen.getByText('Erro ao carregar cargos')).toBeInTheDocument();
  });
});
