import { type Task } from '@template/shared/schemas/task.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-task-form-harness.test.svelte';
import { type TaskFormModel } from './use-task-form.svelte';

vi.mock('$lib/api/tasks.api', () => ({
  tasksApi: { create: vi.fn(), update: vi.fn() },
}));

const { tasksApi } = await import('$lib/api/tasks.api');

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

function mountModel(task: Task | null, onSaved: () => void = vi.fn()): TaskFormModel {
  let model!: TaskFormModel;
  render(Harness, {
    props: { task, onSaved, onReady: (ready: TaskFormModel) => (model = ready) },
  });

  return model;
}

describe('useTaskFormModel', () => {
  beforeEach(() => {
    vi.mocked(tasksApi.create).mockReset().mockResolvedValue(existing);
    vi.mocked(tasksApi.update).mockReset().mockResolvedValue(existing);
  });

  // feliz
  it('starts empty to create', () => {
    const model = mountModel(null);

    expect(model.data.mode).toBe('create');
    expect(model.data.fields.title).toEqual({ value: '', error: null });
    expect(model.data.fields.status.value).toBe('todo');
  });

  it('starts with the task values to edit', () => {
    const model = mountModel(existing);

    expect(model.data.mode).toBe('edit');
    expect(model.data.fields.title.value).toBe('Revisar contrato');
    expect(model.data.fields.description.value).toBe('Cláusula 4');
  });

  it('creates and tells the route it is saved', async () => {
    const onSaved = vi.fn();
    const model = mountModel(null, onSaved);

    model.actions.onChange('title', 'Nova tarefa');
    model.actions.onSubmit();

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(tasksApi.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nova tarefa' }));
  });

  it('updates the task being edited, by its id', async () => {
    const model = mountModel(existing);

    model.actions.onChange('status', 'done');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(tasksApi.update).toHaveBeenCalledWith(5, expect.objectContaining({ status: 'done' })),
    );
  });

  // triste
  it('does not send an empty title, and shows the message from the shared schema', async () => {
    const model = mountModel(null);

    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.title.error).toBe('Informe o título'));
    expect(tasksApi.create).not.toHaveBeenCalled();
  });

  /* O erro de um envio vazio não pode ficar preso: corrigir o campo tem que bastar. */
  it('clears the error and submits once the title is typed after an empty attempt', async () => {
    const onSaved = vi.fn();
    const model = mountModel(null, onSaved);

    model.actions.onSubmit();
    await waitFor(() => expect(model.data.fields.title.error).toBe('Informe o título'));

    model.actions.onChange('title', 'Agora tem título');
    await waitFor(() => expect(model.data.fields.title.error).toBeNull());

    model.actions.onSubmit();
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });

  /* A recusa aparece no formulário, que continua aberto com o que foi digitado. */
  it('keeps the server refusal on screen and does not close', async () => {
    vi.mocked(tasksApi.create).mockRejectedValue(
      new ApiError(403, 'Seu perfil é somente leitura.'),
    );
    const onSaved = vi.fn();
    const model = mountModel(null, onSaved);

    model.actions.onChange('title', 'Nova');
    model.actions.onSubmit();

    await waitFor(() => expect(model.state.error).toBe('Seu perfil é somente leitura.'));
    expect(onSaved).not.toHaveBeenCalled();
    expect(model.data.fields.title.value).toBe('Nova');
  });
});
