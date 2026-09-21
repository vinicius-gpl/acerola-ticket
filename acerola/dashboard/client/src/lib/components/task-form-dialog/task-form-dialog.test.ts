import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TaskFormDialog, { type TaskFormDialogProps } from './task-form-dialog.svelte';

const fields = {
  title: { value: '', error: null },
  description: { value: '', error: null },
  status: { value: 'todo', error: null },
};

function renderForm(overrides: Partial<TaskFormDialogProps> = {}) {
  const actions = { onChange: vi.fn(), onBlur: vi.fn(), onSubmit: vi.fn(), onClose: vi.fn() };

  render(TaskFormDialog, {
    props: {
      data: { mode: 'create', fields },
      state: { isOpen: true },
      actions,
      ...overrides,
    },
  });

  return actions;
}

describe('TaskFormDialog', () => {
  // feliz
  it('reports what is typed in the title, naming the field', async () => {
    const actions = renderForm();

    await userEvent.type(screen.getByLabelText('Título'), 'a');

    expect(actions.onChange).toHaveBeenCalledWith('title', 'a');
  });

  it('submits through the form, so Enter works too', async () => {
    const actions = renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    expect(actions.onSubmit).toHaveBeenCalledOnce();
  });

  it('says it is editing when there is a task', () => {
    renderForm({ data: { mode: 'edit', fields } });

    expect(screen.getByRole('heading', { name: 'Editar tarefa' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });

  // triste
  it('shows the field error next to the field', () => {
    renderForm({
      data: {
        mode: 'create',
        fields: { ...fields, title: { value: '', error: 'Informe o título' } },
      },
    });

    expect(screen.getByLabelText('Título')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Informe o título')).toBeInTheDocument();
  });

  it('keeps the server refusal inside the dialog', () => {
    renderForm({ state: { isOpen: true, error: 'Seu perfil é somente leitura.' } });

    expect(screen.getByText('Seu perfil é somente leitura.')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  /* Dois cliques em "Criar" seriam duas tarefas iguais. */
  it('locks the submit button while saving', () => {
    renderForm({ state: { isOpen: true, isSubmitting: true } });

    expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled();
  });
});
