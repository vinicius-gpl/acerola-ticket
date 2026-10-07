import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import InventoryFormDialog, {
  type AcerolaInventoryFormDialogProps,
  type InventoryFormField,
} from './acerola-inventory-form-dialog.svelte';
import { type FormFieldState } from '$lib/types/form-field.type';

function field(value = '', error: string | null = null): FormFieldState {
  return { value, error };
}

const fields: Record<InventoryFormField, FormFieldState> = {
  name: field('Cadeira giratória'),
  category: field('furniture'),
  unit: field('unit'),
  location: field('Copa'),
  code: field('PAT-0101'),
  note: field(''),
};

const actions = {
  onChange: vi.fn(),
  onBlur: vi.fn(),
  onPhotoChange: vi.fn(),
  onPhotoRemove: vi.fn(),
  onSubmit: vi.fn(),
  onClose: vi.fn(),
};

function setup(overrides: Partial<AcerolaInventoryFormDialogProps> = {}) {
  return render(InventoryFormDialog, {
    props: {
      data: { mode: 'create', fields, photo: { previewUrl: null, fileName: null } },
      state: { isOpen: true },
      actions,
      ...overrides,
    } as AcerolaInventoryFormDialogProps,
  });
}

describe('AcerolaInventoryFormDialog', () => {
  // feliz
  it('shows the product fields with their values', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'Cadastrar produto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do produto')).toHaveValue('Cadeira giratória');
    expect(screen.getByLabelText('Onde fica')).toHaveValue('Copa');
    expect(screen.getByLabelText('Código ou patrimônio')).toHaveValue('PAT-0101');
  });

  it('reports what the person typed', async () => {
    const onChange = vi.fn();
    setup({ actions: { ...actions, onChange } });

    await userEvent.type(screen.getByLabelText('Nome do produto'), 'X');

    expect(onChange).toHaveBeenCalledWith('name', 'Cadeira giratóriaX');
  });

  it('asks to save when the form is submitted', async () => {
    const onSubmit = vi.fn();
    setup({ actions: { ...actions, onSubmit } });

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar produto' }));

    expect(onSubmit).toHaveBeenCalledOnce();
  });

  /* Quem cadastra precisa VER que a imagem escolhida é a certa antes de salvar. */
  it('shows the chosen photo and its file name', () => {
    setup({
      data: {
        mode: 'edit',
        fields,
        photo: { previewUrl: 'blob:preview', fileName: 'cadeira.jpg' },
      },
    });

    expect(screen.getByRole('img', { name: 'Foto do produto' })).toHaveAttribute(
      'src',
      'blob:preview',
    );
    expect(screen.getByText('cadeira.jpg')).toBeInTheDocument();
  });

  it('asks to drop the photo that is there', async () => {
    const onPhotoRemove = vi.fn();
    setup({
      data: { mode: 'edit', fields, photo: { previewUrl: 'blob:preview', fileName: null } },
      actions: { ...actions, onPhotoRemove },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Remover foto' }));

    expect(onPhotoRemove).toHaveBeenCalledOnce();
  });

  /* No celular o inventário é feito andando: fotografar na hora e escolher da galeria são
     dois caminhos, os dois à vista. */
  it('offers both taking a photo and choosing an image', () => {
    setup();

    expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escolher imagem' })).toBeInTheDocument();
    /* É o `capture` que faz o celular abrir a câmera de trás em vez da galeria. */
    expect(document.querySelector('#photo-camera')).toHaveAttribute('capture', 'environment');
    expect(document.querySelector('#photo')).not.toHaveAttribute('capture');
  });

  it('reports the photo taken with the camera', async () => {
    const onPhotoChange = vi.fn();
    setup({ actions: { ...actions, onPhotoChange } });
    const shot = new File(['x'], 'foto.jpg', { type: 'image/jpeg' });

    await userEvent.upload(document.querySelector<HTMLInputElement>('#photo-camera')!, shot);

    expect(onPhotoChange).toHaveBeenCalledWith(shot);
  });

  // triste
  it('shows the error of a field next to it', () => {
    setup({
      data: {
        mode: 'create',
        fields: { ...fields, name: field('', 'Informe o nome do produto') },
        photo: { previewUrl: null, fileName: null },
      },
    });

    expect(screen.getByText('Informe o nome do produto')).toBeInTheDocument();
  });

  /* O erro da foto é dela: o que foi digitado continua na tela. */
  it('shows the photo refusal without touching the other fields', () => {
    setup({ state: { isOpen: true, photoError: 'A foto precisa ser uma imagem.' } });

    expect(screen.getByText('A foto precisa ser uma imagem.')).toBeInTheDocument();
    expect(screen.getByLabelText('Nome do produto')).toHaveValue('Cadeira giratória');
  });

  it('shows the failure of the save with its reason', () => {
    setup({ state: { isOpen: true, error: 'Já existe um produto com esse código.' } });

    expect(screen.getByText('Já existe um produto com esse código.')).toBeInTheDocument();
  });

  /* Enquanto grava, nada pode ser mexido — nem os botões da foto. */
  it('locks the form while saving', () => {
    setup({ state: { isOpen: true, isSubmitting: true } });

    expect(screen.getByLabelText('Nome do produto')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Escolher imagem' })).toBeDisabled();
  });

  /* Sem foto não existe o botão de remover: botão que não faz nada é ruído. */
  it('offers no way to drop a photo that does not exist (edge case)', () => {
    setup();

    expect(screen.queryByRole('button', { name: 'Remover foto' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Escolher imagem' })).toBeInTheDocument();
  });
});
