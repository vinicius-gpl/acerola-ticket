import { type SoftwareProject } from '@template/shared/schemas/software-project.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ProjectListView, { type AcerolaProjectListViewProps } from './acerola-project-list-view.svelte';

const project: SoftwareProject = {
  id: 1,
  name: 'Acerola Ticket',
  description: 'Sistema central de chamados',
  repositoryUrl: 'vinicius-gpl/acerola-ticket',
  githubRepoOwner: 'vinicius-gpl',
  githubRepoName: 'acerola-ticket',
  status: 'active',
  color: 'blue',
  openTicketsCount: 3,
  pullRequestsCount: 7,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
};

function renderView(
  overrides: {
    data?: Partial<AcerolaProjectListViewProps['data']>;
    state?: Partial<AcerolaProjectListViewProps['state']>;
  } = {},
) {
  const actions = {
    onSearchChange: vi.fn(),
    onStatusChange: vi.fn(),
    onClearFilters: vi.fn(),
    onRetry: vi.fn(),
    onRegister: vi.fn(),
    onEdit: vi.fn(),
    onViewTimeline: vi.fn(),
    onAskDelete: vi.fn(),
    onCancelDelete: vi.fn(),
    onConfirmDelete: vi.fn(),
    onSyncGithub: vi.fn(),
  };

  render(ProjectListView, {
    props: {
      data: {
        items: [project],
        total: 1,
        filter: { search: '', status: '' },
        deleting: null,
        ...overrides.data,
      },
      state: {
        isLoading: false,
        isEmpty: false,
        isFilteredOut: false,
        isDeleting: false,
        isSyncing: false,
        error: null,
        deleteError: null,
        syncMessage: null,
        ...overrides.state,
      },
      actions,
    },
  });

  return actions;
}

describe('AcerolaProjectListView', () => {
  // feliz
  it('renders project list and counters correctly', () => {
    renderView();

    expect(screen.getByText('Acerola Ticket')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('triggers register action on clicking Novo Sistema', async () => {
    const actions = renderView();

    const newBtn = screen.getByRole('button', { name: /novo sistema/i });
    await userEvent.click(newBtn);

    expect(actions.onRegister).toHaveBeenCalled();
  });

  it('triggers sync action on clicking Sincronizar', async () => {
    const actions = renderView();

    const syncBtn = screen.getByRole('button', { name: /sincronizar/i });
    await userEvent.click(syncBtn);

    expect(actions.onSyncGithub).toHaveBeenCalledWith(1);
  });

  // triste
  it('shows error state when query fails', () => {
    renderView({
      data: { items: [], total: 0 },
      state: { error: 'Erro ao carregar dados' },
    });

    expect(screen.getByText(/não foi possível carregar os sistemas/i)).toBeInTheDocument();
  });

  it('shows empty state when there are no registered projects', () => {
    renderView({
      data: { items: [], total: 0 },
      state: { isEmpty: true },
    });

    expect(screen.getByText(/nenhum sistema cadastrado/i)).toBeInTheDocument();
  });
});
