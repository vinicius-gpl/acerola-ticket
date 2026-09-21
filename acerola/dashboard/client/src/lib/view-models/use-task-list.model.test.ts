import { type Task } from '@template/shared/schemas/task.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-task-list-harness.test.svelte';
import { type TaskListModel } from './use-task-list.model.svelte';

vi.mock('$lib/api/tasks.api', () => ({
  tasksApi: { list: vi.fn(), update: vi.fn(), remove: vi.fn() },
}));

const { tasksApi } = await import('$lib/api/tasks.api');

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

/** Monta o model. O objeto devolvido tem getters, então continua vivo enquanto o teste roda. */
function mountModel(): TaskListModel {
  let model!: TaskListModel;
  render(Harness, { props: { onReady: (ready: TaskListModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<TaskListModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
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
    const model = await mountLoadedModel();

    expect(model.data.tasks).toHaveLength(2);
    expect(model.data.progress).toEqual({ percentage: 50, done: 1, total: 2 });
  });

  it('sends the filter to the API, trimmed', async () => {
    const model = await mountLoadedModel();

    model.actions.onSearchChange('  contrato  ');
    model.actions.onStatusChange('done');

    await waitFor(() =>
      expect(vi.mocked(tasksApi.list).mock.calls.at(-1)?.[0]).toMatchObject({
        search: 'contrato',
        status: 'done',
      }),
    );
  });

  it('toggles a task between done and todo', async () => {
    const model = await mountLoadedModel();

    model.actions.onToggleDone(task({ id: 7, status: 'todo' }));

    await waitFor(() => expect(tasksApi.update).toHaveBeenCalledWith(7, { status: 'done' }));
  });

  it('asks before deleting, and deletes only on confirm', async () => {
    const model = await mountLoadedModel();
    const target = task({ id: 9 });

    model.actions.onAskDelete(target);
    expect(model.data.pendingDelete).toEqual(target);
    expect(tasksApi.remove).not.toHaveBeenCalled();

    model.actions.onConfirmDelete();

    await waitFor(() => expect(model.data.pendingDelete).toBeNull());
    expect(tasksApi.remove).toHaveBeenCalledWith(9);
  });

  // triste
  /* "Nenhuma tarefa" durante o carregamento faz a pessoa achar que os dados sumiram. */
  it('is empty only after the query is done, never while loading', () => {
    vi.mocked(tasksApi.list).mockReturnValue(new Promise(() => {}));

    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });

  it('tells "nothing exists" apart from "the filter hid everything"', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue(page([]));
    const model = await mountLoadedModel();

    expect(model.state.isEmpty).toBe(true);
    expect(model.state.isFilteredOut).toBe(false);

    model.actions.onStatusChange('done');

    await waitFor(() => expect(model.state.isFilteredOut).toBe(true));
    expect(model.state.isEmpty).toBe(false);
  });

  it('brings the API failure with its reason', async () => {
    vi.mocked(tasksApi.list).mockRejectedValue(new ApiError(503, 'O banco está ocupado.'));

    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O banco está ocupado.'));
  });

  /* O modal fica aberto com o motivo: fechar faria a pessoa achar que excluiu. */
  it('keeps the delete dialog open with the refusal', async () => {
    vi.mocked(tasksApi.remove).mockRejectedValue(
      new ApiError(403, 'Excluir tarefas é uma ação de administrador.'),
    );
    const model = await mountLoadedModel();

    model.actions.onAskDelete(task());
    model.actions.onConfirmDelete();

    await waitFor(() =>
      expect(model.state.deleteError).toBe('Excluir tarefas é uma ação de administrador.'),
    );
    expect(model.data.pendingDelete).not.toBeNull();
  });

  it('says the list was cut when more matched than came back', async () => {
    vi.mocked(tasksApi.list).mockResolvedValue(page([task()], 250));
    const model = await mountLoadedModel();

    expect(model.state.isTruncated).toBe(true);
  });
});
