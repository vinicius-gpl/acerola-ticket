import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type Task } from '@template/shared/schemas/task.schema';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import { useTaskFormModel } from './use-task-form.model';

vi.mock('../api/tasks.api', () => ({
  tasksApi: { create: vi.fn(), update: vi.fn() },
}));

const { tasksApi } = await import('$lib/api/tasks.api');

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const existing: Task = {
  id: 5,
  title: 'Revisar contrato',
  description: 'Cláusula 4',
  status: 'doing',
  createdAt: '2026-09-14T12:00:00.000Z',
  createdBy: 'ana@empresa.com.br',
  updatedAt: null,
  updatedBy: null,
};

describe('useTaskFormModel', () => {
  beforeEach(() => {
    vi.mocked(tasksApi.create).mockReset().mockResolvedValue(existing);
    vi.mocked(tasksApi.update).mockReset().mockResolvedValue(existing);
  });

  // feliz
  it('starts empty to create', () => {
    const { result } = renderHook(() => useTaskFormModel({ task: null, onSaved: vi.fn() }), {
      wrapper,
    });

    expect(result.current.data.mode).toBe('create');
    expect(result.current.data.fields.title).toEqual({ value: '', error: null });
    expect(result.current.data.fields.status.value).toBe('todo');
  });

  it('starts with the task values to edit', () => {
    const { result } = renderHook(() => useTaskFormModel({ task: existing, onSaved: vi.fn() }), {
      wrapper,
    });

    expect(result.current.data.mode).toBe('edit');
    expect(result.current.data.fields.title.value).toBe('Revisar contrato');
    expect(result.current.data.fields.description.value).toBe('Cláusula 4');
  });

  it('creates and tells the route it is saved', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useTaskFormModel({ task: null, onSaved }), { wrapper });

    act(() => result.current.actions.onChange('title', 'Nova tarefa'));
    act(() => result.current.actions.onSubmit());

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(tasksApi.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nova tarefa' }));
  });

  it('updates the task being edited, by its id', async () => {
    const { result } = renderHook(() => useTaskFormModel({ task: existing, onSaved: vi.fn() }), {
      wrapper,
    });

    act(() => result.current.actions.onChange('status', 'done'));
    act(() => result.current.actions.onSubmit());

    await waitFor(() =>
      expect(tasksApi.update).toHaveBeenCalledWith(5, expect.objectContaining({ status: 'done' })),
    );
  });

  // triste
  it('does not send an empty title, and shows the message from the shared schema', async () => {
    const { result } = renderHook(() => useTaskFormModel({ task: null, onSaved: vi.fn() }), {
      wrapper,
    });

    act(() => result.current.actions.onSubmit());

    await waitFor(() => expect(result.current.data.fields.title.error).toBe('Informe o título'));
    expect(tasksApi.create).not.toHaveBeenCalled();
  });

  /* O erro de um envio vazio não pode ficar preso: corrigir o campo tem que bastar. */
  it('clears the error and submits once the title is typed after an empty attempt', async () => {
    const onSaved = vi.fn();
    const { result } = renderHook(() => useTaskFormModel({ task: null, onSaved }), { wrapper });

    act(() => result.current.actions.onSubmit());
    await waitFor(() => expect(result.current.data.fields.title.error).toBe('Informe o título'));

    act(() => result.current.actions.onChange('title', 'Agora tem título'));
    await waitFor(() => expect(result.current.data.fields.title.error).toBeNull());

    act(() => result.current.actions.onSubmit());
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });

  /* A recusa aparece no formulário, que continua aberto com o que foi digitado. */
  it('keeps the server refusal on screen and does not close', async () => {
    vi.mocked(tasksApi.create).mockRejectedValue(
      new ApiError(403, 'Seu perfil é somente leitura.'),
    );
    const onSaved = vi.fn();
    const { result } = renderHook(() => useTaskFormModel({ task: null, onSaved }), { wrapper });

    act(() => result.current.actions.onChange('title', 'Nova'));
    act(() => result.current.actions.onSubmit());

    await waitFor(() => expect(result.current.state.error).toBe('Seu perfil é somente leitura.'));
    expect(onSaved).not.toHaveBeenCalled();
    expect(result.current.data.fields.title.value).toBe('Nova');
  });
});
