import { type Part } from '@template/shared/schemas/part.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type FormFieldState } from '$lib/types/form-field.type';
import MovementFormDialog, {
  type MovementFormField,
} from './movement-form-dialog.svelte';

function part(over: Partial<Part> = {}): Part {
  return {
    id: 1,
    name: 'SSD 240 GB Kingston',
    category: 'ssd',
    condition: 'new',
    balance: 3,
    createdAt: '2026-09-01T12:00:00.000Z',
    createdBy: 'suporte@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

function field(value = '', error: string | null = null): FormFieldState {
  return { value, error };
}

function fields(
  over: Partial<Record<MovementFormField, FormFieldState>> = {},
): Record<MovementFormField, FormFieldState> {
  return {
    quantity: field('1'),
    computerId: field(''),
    handledBy: field(),
    note: field(),
    ...over,
  };
}

const machines = [{ value: '3', label: 'Contábil — mesa do fechamento (CONTABIL-03)' }];

const actions = {
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

describe('MovementFormDialog', () => {
  // feliz
  /* O saldo fica visível o tempo todo: é o número que decide se a saída cabe. */
  it('keeps the current shelf count in front of the person', () => {
    render(MovementFormDialog, {
      props: {
        data: { part: part({ balance: 3 }), type: 'out', fields: fields(), machines },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.getByText(/hoje há/)).toHaveTextContent('3');
  });

  /* O tipo veio do botão: quem clicou em "Saída" já disse o que queria. */
  it('names the movement instead of asking for it again', () => {
    render(MovementFormDialog, {
      props: {
        data: { part: part(), type: 'out', fields: fields(), machines },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.getByText('Saída de peça')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar saída' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Tipo')).not.toBeInTheDocument();
  });

  it('asks where the part is going on an exit, and where it came from on an entry', async () => {
    const { rerender } = render(MovementFormDialog, {
      props: {
        data: { part: part(), type: 'out', fields: fields(), machines },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.getByLabelText('Para qual máquina')).toBeInTheDocument();

    await rerender({
      data: { part: part(), type: 'in', fields: fields(), machines },
      state: { isOpen: true },
      actions,
    });

    expect(screen.getByLabelText('De qual máquina')).toBeInTheDocument();
  });

  it('sends the form when it is submitted', async () => {
    const user = userEvent.setup();
    render(MovementFormDialog, {
      props: {
        data: { part: part(), type: 'in', fields: fields(), machines },
        state: { isOpen: true },
        actions,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Registrar entrada' }));

    expect(actions.onSubmit).toHaveBeenCalled();
  });

  // triste
  it('shows the field error right under the field', () => {
    render(MovementFormDialog, {
      props: {
        data: {
          part: part(),
          type: 'out',
          fields: fields({ quantity: field('0', 'A quantidade precisa ser pelo menos 1') }),
          machines,
        },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.getByText('A quantidade precisa ser pelo menos 1')).toBeInTheDocument();
  });

  /* A recusa por falta de estoque aparece DENTRO do modal, que continua aberto: fechar
     jogaria fora o que foi digitado e esconderia o número que explica a recusa. */
  it('keeps the form open and shows why the stock did not cover it', () => {
    render(MovementFormDialog, {
      props: {
        data: { part: part(), type: 'out', fields: fields({ quantity: field('5') }), machines },
        state: {
          isOpen: true,
          error: 'Só há 3 de SSD 240 GB Kingston no depósito, e a saída é de 5.',
        },
        actions,
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('Só há 3 de SSD 240 GB Kingston');
    expect(screen.getByDisplayValue('5')).toBeInTheDocument();
  });

  it('says the machines are still loading instead of showing an empty list', () => {
    render(MovementFormDialog, {
      props: {
        data: { part: part(), type: 'out', fields: fields(), machines: [] },
        state: { isOpen: true, isMachinesLoading: true },
        actions,
      },
    });

    expect(screen.getByText('Carregando as máquinas do inventário…')).toBeInTheDocument();
  });
});
