import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type FormFieldState } from '$lib/types/form-field.type';
import PartFormDialog, { type PartFormField } from './part-form-dialog.svelte';

function field(value = '', error: string | null = null): FormFieldState {
  return { value, error };
}

function fields(
  over: Partial<Record<PartFormField, FormFieldState>> = {},
): Record<PartFormField, FormFieldState> {
  return {
    name: field(),
    category: field('ssd'),
    condition: field('new'),
    initialQuantity: field(),
    ...over,
  };
}

const actions = {
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

describe('PartFormDialog', () => {
  // feliz
  it('asks what the part is, and how many are on the shelf today', () => {
    render(PartFormDialog, {
      props: { data: { mode: 'create', fields: fields() }, state: { isOpen: true }, actions },
    });

    expect(screen.getByLabelText('O que é a peça')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantas existem hoje')).toBeInTheDocument();
    expect(screen.getByText(/primeira entrada no histórico/)).toBeInTheDocument();
  });

  it('sends the form when it is submitted', async () => {
    const user = userEvent.setup();
    render(PartFormDialog, {
      props: {
        data: { mode: 'create', fields: fields({ name: field('SSD 240 GB') }) },
        state: { isOpen: true },
        actions,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Cadastrar peça' }));

    expect(actions.onSubmit).toHaveBeenCalled();
  });

  // triste
  /* Na edição não existe campo de quantidade: ele seria um jeito de reescrever o estoque
     sem deixar linha no extrato. */
  it('does not offer a quantity field when fixing a part already registered', () => {
    render(PartFormDialog, {
      props: {
        data: { mode: 'edit', fields: fields({ name: field('SSD 240 GB') }) },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.queryByLabelText('Quantas existem hoje')).not.toBeInTheDocument();
  });

  it('shows the field error right under the field', () => {
    render(PartFormDialog, {
      props: {
        data: { mode: 'create', fields: fields({ name: field('', 'Informe o que é a peça') }) },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.getByText('Informe o que é a peça')).toBeInTheDocument();
  });

  /* A recusa do servidor aparece DENTRO do modal, que continua aberto com o que foi digitado. */
  it('keeps the form open and shows why the server refused', () => {
    render(PartFormDialog, {
      props: {
        data: { mode: 'create', fields: fields({ name: field('SSD 240 GB') }) },
        state: { isOpen: true, error: 'Já existe uma peça com essa descrição e essa condição.' },
        actions,
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Já existe uma peça com essa descrição e essa condição.',
    );
    expect(screen.getByDisplayValue('SSD 240 GB')).toBeInTheDocument();
  });
});
