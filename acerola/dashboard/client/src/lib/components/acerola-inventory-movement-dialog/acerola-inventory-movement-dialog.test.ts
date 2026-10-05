import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import InventoryMovementDialog, {
  type AcerolaInventoryMovementDialogProps,
  type InventoryMovementFormField,
} from './acerola-inventory-movement-dialog.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

function field(value = '', error: string | null = null): FormFieldState {
  return { value, error };
}

const fields: Record<InventoryMovementFormField, FormFieldState> = {
  itemId: field('4'),
  quantity: field('3'),
  reason: field(''),
  note: field(''),
};

const product = { name: 'Café torrado e moído 500 g', balance: 7, unitLabel: 'Pacote' };

const productOptions = [
  { value: '4', label: 'Café torrado e moído 500 g' },
  { value: '9', label: 'Lâmpada LED' },
];

const actions = {
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

function setup(overrides: Partial<AcerolaInventoryMovementDialogProps> = {}) {
  return render(InventoryMovementDialog, {
    props: {
      data: { type: 'in', product, productOptions: [], fields },
      state: { isOpen: true },
      actions,
      ...overrides,
    } as AcerolaInventoryMovementDialogProps,
  });
}

describe('AcerolaInventoryMovementDialog', () => {
  // feliz
  /* O saldo fica à vista: é o número que decide se a saída cabe. */
  it('names the movement and shows how much there is of the product', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'Entrada no depósito' })).toBeInTheDocument();
    expect(screen.getByText(/Café torrado e moído 500 g · hoje há/)).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantidade')).toHaveValue('3');
  });

  it('changes the title and the button with the kind of movement', () => {
    setup({ data: { type: 'out', product, productOptions: [], fields } });

    expect(screen.getByRole('heading', { name: 'Saída do depósito' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Registrar saída' })).toBeInTheDocument();
  });

  it('reports what the person typed', async () => {
    const onChange = vi.fn();
    setup({ actions: { ...actions, onChange } });

    await userEvent.type(screen.getByLabelText('Quantidade'), '0');

    expect(onChange).toHaveBeenCalledWith('quantity', '30');
  });

  it('asks to save when the form is submitted', async () => {
    const onSubmit = vi.fn();
    setup({ actions: { ...actions, onSubmit } });

    await userEvent.click(screen.getByRole('button', { name: 'Registrar entrada' }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  /* O motivo é do descarte: só ele pergunta, e só ele deixa escolher o produto. */
  it('asks for the product and for the reason on a disposal', () => {
    setup({
      data: {
        type: 'disposal',
        product: null,
        productOptions,
        fields: { ...fields, itemId: field('') },
      },
    });

    expect(screen.getByRole('heading', { name: 'Registrar descarte' })).toBeInTheDocument();
    expect(screen.getByText('Produto')).toBeInTheDocument();
    expect(screen.getByText('Motivo')).toBeInTheDocument();
    expect(
      screen.getByText('Escolha o produto para ver quanto há no depósito.'),
    ).toBeInTheDocument();
  });

  // triste
  it('does not ask for a reason on an entry or an exit', () => {
    setup();

    expect(screen.queryByText('Motivo')).toBeNull();
    expect(screen.queryByText('Produto')).toBeNull();
  });

  it('shows the error of each field next to it', () => {
    setup({
      data: {
        type: 'disposal',
        product: null,
        productOptions,
        fields: {
          itemId: field('', 'Escolha o produto'),
          quantity: field('', 'Informe a quantidade'),
          reason: field('', 'Escolha o motivo do descarte'),
          note: field(''),
        },
      },
    });

    /* Duas vezes: a frase é o convite dentro do seletor vazio E o erro embaixo dele. */
    expect(screen.getAllByText('Escolha o produto')).toHaveLength(2);
    expect(screen.getByText('Informe a quantidade')).toBeInTheDocument();
    expect(screen.getByText('Escolha o motivo do descarte')).toBeInTheDocument();
  });

  /* A recusa do servidor aparece DENTRO do diálogo, com o que foi digitado ainda lá. */
  it('shows the refusal of the server without losing what was typed', () => {
    setup({ state: { isOpen: true, error: 'Só há 7 de Café no depósito.' } });

    expect(screen.getByText('Só há 7 de Café no depósito.')).toBeInTheDocument();
    expect(screen.getByLabelText('Quantidade')).toHaveValue('3');
  });

  it('locks the form while saving', () => {
    setup({ state: { isOpen: true, isSubmitting: true } });

    expect(screen.getByLabelText('Quantidade')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  });
});
