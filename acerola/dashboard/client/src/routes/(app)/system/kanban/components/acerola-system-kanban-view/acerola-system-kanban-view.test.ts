import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SystemKanbanView, {
  type AcerolaSystemKanbanViewProps,
} from './acerola-system-kanban-view.svelte';

function renderView(
  overrides: {
    data?: Partial<AcerolaSystemKanbanViewProps['data']>;
    state?: Partial<AcerolaSystemKanbanViewProps['state']>;
  } = {},
) {
  const actions = {
    onSelectProject: vi.fn(),
    onRetry: vi.fn(),
    onOpenTicket: vi.fn(),
    onMoveTicket: vi.fn().mockResolvedValue(undefined),
    onSetCardColor: vi.fn(),
  };

  render(SystemKanbanView, {
    props: {
      data: {
        cardColors: {},
        columns: [
          {
            id: 'todo',
            title: 'Abertos',
            tickets: [
              {
                id: 10,
                protocol: 'CH-0010',
                title: 'Bug no login',
                description: 'Bug no login',
                priority: 'high',
                projectName: 'Acerola Ticket',
                requesterName: 'Ana',
                githubIssueNumber: 42,
                githubIssueUrl: 'https://github.com/issue/42',
                createdAt: '2026-10-06T12:00:00.000Z',
              } as any,
            ],
          },
          { id: 'in_progress', title: 'Em Atendimento', tickets: [] },
          { id: 'waiting', title: 'Aguardando Terceiros', tickets: [] },
          { id: 'done', title: 'Resolvidos', tickets: [] },
        ],
        projects: [
          {
            id: 1,
            name: 'Acerola Ticket',
            description: null,
            repositoryUrl: 'owner/repo',
            githubRepoOwner: 'owner',
            githubRepoName: 'repo',
            status: 'active',
            color: 'blue',
            openTicketsCount: 1,
            pullRequestsCount: 0,
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: null,
          },
        ],
        selectedProjectId: null,
        totalTickets: 1,
        ...overrides.data,
      },
      state: {
        isLoading: false,
        isEmpty: false,
        error: null,
        ...overrides.state,
      },
      actions,
    },
  });

  return actions;
}

describe('AcerolaSystemKanbanView', () => {
  // feliz
  it('renders kanban columns and ticket card', () => {
    renderView();

    expect(screen.getByText('Abertos')).toBeInTheDocument();
    expect(screen.getByText('CH-0010')).toBeInTheDocument();
    expect(screen.getByText('Bug no login')).toBeInTheDocument();
    expect(screen.getByText('#42')).toBeInTheDocument();
  });

  it('triggers onOpenTicket when ticket card is clicked', async () => {
    const actions = renderView();

    const card = screen.getByText('CH-0010');
    await userEvent.click(card);

    expect(actions.onOpenTicket).toHaveBeenCalledWith(10);
  });

  // triste
  it('displays error state and allows retry', async () => {
    const actions = renderView({
      state: { error: 'Erro de conexão' },
    });

    expect(screen.getByText(/não foi possível carregar o kanban/i)).toBeInTheDocument();

    const retryBtn = screen.getByRole('button', { name: /tentar de novo/i });
    await userEvent.click(retryBtn);
    expect(actions.onRetry).toHaveBeenCalled();
  });

  it('displays empty state when total tickets is 0', () => {
    renderView({
      data: {
        columns: [
          { id: 'todo', title: 'Abertos', tickets: [] },
          { id: 'in_progress', title: 'Em Atendimento', tickets: [] },
          { id: 'waiting', title: 'Aguardando Terceiros', tickets: [] },
          { id: 'done', title: 'Resolvidos', tickets: [] },
        ],
        totalTickets: 0,
      },
      state: { isEmpty: true },
    });

    expect(screen.getByText(/nenhum chamado no kanban/i)).toBeInTheDocument();
  });
});
