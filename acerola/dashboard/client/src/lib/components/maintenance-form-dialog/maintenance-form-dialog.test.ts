import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type FormFieldState } from '$lib/types/form-field.type';
import MaintenanceFormDialog, {
  type MaintenanceFormField,
} from './maintenance-form-dialog.svelte';

function field(value = '', error: string | null = null): FormFieldState {
  return { value, error };
}

function fields(
  over: Partial<Record<MaintenanceFormField, FormFieldState>> = {},
): Record<MaintenanceFormField, FormFieldState> {
  return {
    computerId: field('3'),
    otherMachine: field(),
    type: field('preventive'),
    description: field(),
    performedBy: field(),
    performedAt: field('2026-09-20'),
    ...over,
  };
}

const machines = [
  { value: '3', label: 'Contábil — mesa do fechamento (CONTABIL-03)' },
  { value: '1', label: 'Recepção — balcão (RECEPCAO-01)' },
];

const actions = {
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

describe('MaintenanceFormDialog', () => {
  // feliz
  it('asks what was done, on which machine and when', () => {
    render(MaintenanceFormDialog, {
      props: {
        data: { mode: 'create', fields: fields(), machines },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.getByLabelText('Equipamento')).toBeInTheDocument();
    expect(screen.getByLabelText('O que foi feito')).toBeInTheDocument();
    expect(screen.getByLabelText('Data do serviço')).toHaveValue('2026-09-20');
  });

  /* O campo de texto só existe quando nenhuma máquina foi escolhida: os dois juntos
     deixariam o registro dizendo duas coisas sobre o mesmo serviço. */
  it('offers the free-text equipment only when no machine is chosen', async () => {
    const { rerender } = render(MaintenanceFormDialog, {
      props: {
        data: { mode: 'create', fields: fields(), machines },
        state: { isOpen: true },
        actions,
      },
    });

    expect(screen.queryByLabelText('Qual equipamento')).not.toBeInTheDocument();

    await rerender({
      data: { mode: 'create', fields: fields({ computerId: field('') }), machines },
      state: { isOpen: true },
      actions,
    });

    expect(screen.getByLabelText('Qual equipamento')).toBeInTheDocument();
  });

  it('sends the form when it is submitted', async () => {
    const user = userEvent.setup();
    render(MaintenanceFormDialog, {
      props: {
        data: { mode: 'create', fields: fields(), machines },
        state: { isOpen: true },
        actions,
      },
    });

    await user.click(screen.getByRole('button', { name: 'Registrar manutenção' }));

    expect(actions.onSubmit).toHaveBeenCalled();
  });

  // triste
  it('shows the field error right under the field', () => {
    render(MaintenanceFormDialog, {
      props: {
        data: {
          mode: 'create',
          fields: fields({
            computerId: field(''),
            otherMachine: field('', 'Escolha a máquina na lista ou escreva o nome do equipamento'),
          }),
          machines,
        },
        state: { isOpen: true },
        actions,
      },
    });

    expect(
      screen.getByText('Escolha a máquina na lista ou escreva o nome do equipamento'),
    ).toBeInTheDocument();
  });

  /* A recusa do servidor aparece DENTRO do modal, que continua aberto com o que foi digitado. */
  it('keeps the form open and shows why the server refused', () => {
    render(MaintenanceFormDialog, {
      props: {
        data: {
          mode: 'create',
          fields: fields({ description: field('Troca de SSD') }),
          machines,
        },
        state: { isOpen: true, error: 'A máquina escolhida não existe mais.' },
        actions,
      },
    });

    expect(screen.getByRole('alert')).toHaveTextContent('A máquina escolhida não existe mais.');
    expect(screen.getByDisplayValue('Troca de SSD')).toBeInTheDocument();
  });

  it('says the machines are still loading instead of showing an empty list', () => {
    render(MaintenanceFormDialog, {
      props: {
        data: { mode: 'create', fields: fields(), machines: [] },
        state: { isOpen: true, isMachinesLoading: true },
        actions,
      },
    });

    expect(screen.getByText('Carregando as máquinas do inventário…')).toBeInTheDocument();
  });
});
