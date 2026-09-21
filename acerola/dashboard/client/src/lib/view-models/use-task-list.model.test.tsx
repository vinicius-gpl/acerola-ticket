import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type Task } from '@template/shared/schemas/task.schema';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import { useTaskListModel } from './use-task-list.model.svelte.ts';

vi.mock('../api/tasks.api', () => ({
  tasksApi: { list: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const { tasksApi } = await import('$lib/api/tasks.api');

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Ligar para o cliente',
    description: null,
    status: 'todo',
    createdAt: '2026-09-14T12:00:00.000Z',
    createdBy: 'ana@empresa.com.br',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

function page(items: Task[], total = items.length) {
  return { items, total, page: 1, pageSize: 200 };
}

async function renderModel() {
  const view = renderHook(() => useTaskListModel(), { wrapper });
  await waitFor(() => expect(view.result.current.state.isLoading).toBe(false));

  return view;
}

describe('useTaskListModel', () => {
  beforeEach(() => {
    vi.mocked(tasksApi.list)
      .mockReset()
      .mockResolvedValue(page([task(), task({ id: 2, status: 'done' })]));
    vi.mocked(tasksApi.update)
      .mockReset()
      .mockResolvedValue(task({ status: 'done' }));
    vi.mocked(tasksApi.remove).mockReset().mockResolvedValue(undefined);
  });

  // feliz
  it('loads the tasks and computes the progress', async () => {
    const { result } = await renderModel();

    expect(result.current.data.tasks).toHaveLength(2);
    expect(result.current.data.progress).toEqual({ percentage: 50, done: 1, total: 2 });
  });

  it('sends the filter to the API, trimmed', async () => {
    const { result } = await renderModel();

    act(() => result.current.actions.onSearchChange('  contrato  '));
    act(() => result.current.actions.onStatusChange('done'));

    await waitFor(() =>
      expect(vi.mocked(tasksApi.list).mock.calls.at(-1)?.[0]).toMatchObject({
        search: 'contrato',
        status: 'done',
      }),
    );
  });

  it('toggles a task between done and todo', async () => {
    const { result } = await renderModel();

    act(() => result.current.actions.onToggleDone(task({ id: 7, status: 'todo' })));

    await waitFor(() => expect(tasksApi.update).toHaveBeenCalledWith(7, { status: 'done' }));
  });

  it('asks before deleting, and deletes only on confirm', async () => {
    const { result } = await renderModel();
    const target = task({ id: 9 });

    act(() => result.current.actions.onAskDelete(target));
    expect(result.current.data.pendingDelete).toEqual(target);
    expect(tasksApi.remove).not.toHaveBeenCalled();

    act(() => result.current.actions.onConfirmDelete());

    await waitFor(() => expect(result.current.data.pendingDelete).toBeNull());
    expect(tasksApi.remove).toHaveBeenCalledWith(9);
  });

  // triste
  /* "Nenhuma tarefa" durante o carregamento faz a pessoa achar que os dados sumiram. */
  it('is empty only after the query is done, never while loading', () => {
    vi.mocked(tasksApi.list).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTaskListModel(), { wrapper });

    expect(result.current.state.isLoading).toBe(true);
    expect(result.current.state.isEmpty).toBe(false);
  });

  it('tells "nothing exists" apart from "the filter hid everything"', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue(page([]));
    const { result } = await renderModel();

    expect(result.current.state.isEmpty).toBe(true);
    expect(result.current.state.isFilteredOut).toBe(false);

    act(() => result.current.actions.onStatusChange('done'));

    await waitFor(() => expect(result.current.state.isFilteredOut).toBe(true));
    expect(result.current.state.isEmpty).toBe(false);
  });

  it('brings the API failure with its reason', async () => {
    vi.mocked(tasksApi.list).mockRejectedValue(new ApiError(503, 'O banco está ocupado.'));

    const { result } = renderHook(() => useTaskListModel(), { wrapper });

    await waitFor(() => expect(result.current.state.error).toBe('O banco está ocupado.'));
  });

  /* O modal fica aberto com o motivo: fechar faria a pessoa achar que excluiu. */
  it('keeps the delete dialog open with the refusal', async () => {
    vi.mocked(tasksApi.remove).mockRejectedValue(
      new ApiError(403, 'Excluir tarefas é uma ação de administrador.'),
    );
    const { result } = await renderModel();

    act(() => result.current.actions.onAskDelete(task()));
    act(() => result.current.actions.onConfirmDelete());

    await waitFor(() =>
      expect(result.current.state.deleteError).toBe('Excluir tarefas é uma ação de administrador.'),
    );
    expect(result.current.data.pendingDelete).not.toBeNull();
  });

  it('says the list was cut when more matched than came back', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue(page([task()], 250));
    const { result } = await renderModel();

    expect(result.current.state.isTruncated).toBe(true);
  });
});
