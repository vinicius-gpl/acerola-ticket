import { type Task } from '@template/shared/schemas/task.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { TaskListView, type TaskListViewProps } from './task-list-view.component';

const task: Task = {
  id: 1,
  title: 'Ligar para o cliente',
  description: 'Confirmar o horário',
  status: 'doing',
  createdAt: '2026-09-14T12:00:00.000Z',
  createdBy: 'ana@empresa.com.br',
  updatedAt: null,
  updatedBy: null,
};

function renderView(
  overrides: {
    data?: Partial<TaskListViewProps['data']>;
    state?: Partial<TaskListViewProps['state']>;
  } = {},
) {
  const actions = {
    onCreate: vi.fn(),
    onEdit: vi.fn(),
    onToggleDone: vi.fn(),
    onAskDelete: vi.fn(),
    onSearchChange: vi.fn(),
    onStatusChange: vi.fn(),
    onClearFilters: vi.fn(),
    onRetry: vi.fn(),
  };

  render(TaskListView, {
    props: {
      data: {
        tasks: [task],
        total: 1,
        progress: { percentage: 0, done: 0, total: 1 },
        filter: { search: '', status: '' },
        ...overrides.data,
      },
      state: {
        isLoading: false,
        isEmpty: false,
        isFilteredOut: false,
        error: null,
        ...overrides.state,
      },
      actions,
    },
  });

  return actions;
}

describe('TaskListView', () => {
  // feliz
  it('lists the tasks with their status label in Portuguese', () => {
    renderView();

    expect(screen.getByText('Ligar para o cliente')).toBeInTheDocument();
    expect(screen.getByText('Em andamento')).toBeInTheDocument();
  });

  it('opens the form to create', async () => {
    const actions = renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Nova tarefa' }));

    expect(actions.onCreate).toHaveBeenCalledOnce();
  });

  it('passes the task to edit, toggle and delete', async () => {
    const actions = renderView();

    await userEvent.click(screen.getByRole('button', { name: 'Editar tarefa' }));
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como concluída' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir tarefa' }));

    expect(actions.onEdit).toHaveBeenCalledWith(task);
    expect(actions.onToggleDone).toHaveBeenCalledWith(task);
    expect(actions.onAskDelete).toHaveBeenCalledWith(task);
  });

  // triste
  /* "Nenhuma tarefa" durante o carregamento faz a pessoa achar que os dados sumiram. */
  it('shows the skeleton while loading, never the empty message', () => {
    renderView({ state: { isLoading: true } });

    expect(screen.getByLabelText('Carregando tarefas')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma tarefa ainda')).not.toBeInTheDocument();
  });

  it('shows the reason of the failure and lets the person retry', async () => {
    const actions = renderView({ state: { error: 'Não consegui falar com o servidor.' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui falar com o servidor.');

    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(actions.onRetry).toHaveBeenCalledOnce();
  });

  it('tells a truly empty list apart from a filter that hid everything', async () => {
    const actions = renderView({ data: { tasks: [] }, state: { isFilteredOut: true } });

    expect(screen.getByText('Nenhuma tarefa encontrada')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(actions.onClearFilters).toHaveBeenCalledOnce();
  });

  it('hides write buttons from a read-only profile', () => {
    renderView({ state: { canEdit: false } });

    expect(screen.queryByRole('button', { name: 'Nova tarefa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Editar tarefa' })).not.toBeInTheDocument();
  });

  it('says the list was cut when more matched than came back', () => {
    renderView({ data: { total: 250 }, state: { isTruncated: true } });

    expect(screen.getByText(/Mostrando só as primeiras 1/)).toBeInTheDocument();
  });
});
