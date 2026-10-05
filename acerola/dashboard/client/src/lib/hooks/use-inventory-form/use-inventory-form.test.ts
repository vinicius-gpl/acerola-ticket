import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-inventory-form-harness.test.svelte';
import { type InventoryFormModel } from './use-inventory-form.svelte';

vi.mock('$lib/api/inventory-items.api', () => ({
  inventoryItemsApi: { create: vi.fn(), update: vi.fn() },
}));

const { inventoryItemsApi } = await import('$lib/api/inventory-items.api');

function item(over: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 7,
    name: 'Cadeira giratória',
    category: 'furniture',
    unit: 'unit',
    location: 'Sala da contabilidade',
    code: 'PAT-0101',
    note: null,
    photoUrl: 'https://r2.exemplo/foto.webp',
    createdAt: '2026-09-01T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

/** Um arquivo de verdade para o jsdom: o que importa é o tipo e o tamanho. */
function file(name = 'cadeira.jpg', type = 'image/jpeg'): File {
  return new File(['imagem-de-mentira'], name, { type });
}

function mountModel(
  existing: InventoryItem | null = null,
  onSaved: () => void = vi.fn(),
): InventoryFormModel {
  let model!: InventoryFormModel;
  render(Harness, {
    props: { item: existing, onSaved, onReady: (ready: InventoryFormModel) => (model = ready) },
  });

  return model;
}

beforeEach(() => {
  vi.mocked(inventoryItemsApi.create).mockReset().mockResolvedValue(item());
  vi.mocked(inventoryItemsApi.update).mockReset().mockResolvedValue(item());
  /* O jsdom não implementa o endereço temporário de arquivo; a prévia só precisa existir. */
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:previa');
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('useInventoryFormModel', () => {
  // feliz
  it('starts empty when there is no product to correct', () => {
    const model = mountModel();

    expect(model.data.mode).toBe('create');
    expect(model.data.fields.name.value).toBe('');
    expect(model.data.photo.previewUrl).toBeNull();
  });

  it('starts with the values of the product being corrected, photo included', () => {
    const model = mountModel(item());

    expect(model.data.mode).toBe('edit');
    expect(model.data.fields.name.value).toBe('Cadeira giratória');
    expect(model.data.fields.code.value).toBe('PAT-0101');
    expect(model.data.photo.previewUrl).toBe('https://r2.exemplo/foto.webp');
  });

  it('registers the product with the photo that was chosen', async () => {
    const onSaved = vi.fn();
    const model = mountModel(null, onSaved);

    model.actions.onChange('name', 'Café em pó');
    model.actions.onChange('category', 'pantry');
    model.actions.onPhotoChange(file());
    model.actions.onSubmit();

    await waitFor(() => expect(inventoryItemsApi.create).toHaveBeenCalled());
    expect(inventoryItemsApi.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Café em pó', category: 'pantry' }),
      expect.any(File),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
  });

  /* Mostrar a prévia é o que deixa a pessoa conferir que escolheu a imagem certa. */
  it('shows a preview of the chosen photo, with the file name', () => {
    const model = mountModel();

    model.actions.onPhotoChange(file('cadeira-da-contabilidade.jpg'));

    expect(model.data.photo.previewUrl).toBe('blob:previa');
    expect(model.data.photo.fileName).toBe('cadeira-da-contabilidade.jpg');
  });

  /* Tirar a foto é uma ordem explícita, e vai ao servidor como tal. */
  it('asks to remove the photo of the product being corrected', async () => {
    const model = mountModel(item());

    model.actions.onPhotoRemove();
    expect(model.data.photo.previewUrl).toBeNull();

    model.actions.onSubmit();

    await waitFor(() =>
      expect(inventoryItemsApi.update).toHaveBeenCalledWith(7, expect.anything(), null, true),
    );
  });

  // triste
  it('refuses to send a product without a name', async () => {
    const model = mountModel();

    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.name.error).toBe('Informe o nome do produto'));
    expect(inventoryItemsApi.create).not.toHaveBeenCalled();
  });

  /* A foto é recusada NA TELA, pela mesma régua do servidor — e o que foi digitado fica. */
  it('refuses a file that is not an accepted image, keeping what was typed', () => {
    const model = mountModel();

    model.actions.onChange('name', 'Mesa');
    model.actions.onPhotoChange(file('contrato.pdf', 'application/pdf'));

    expect(model.state.photoError).toContain('imagem');
    expect(model.data.photo.previewUrl).toBeNull();
    expect(model.data.fields.name.value).toBe('Mesa');
  });

  it('shows the reason when the server refuses to save', async () => {
    vi.mocked(inventoryItemsApi.create).mockRejectedValue(
      new ApiError(422, 'Já existe um produto com esse código de patrimônio.'),
    );
    const model = mountModel();

    model.actions.onChange('name', 'Mesa');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(model.state.error).toBe('Já existe um produto com esse código de patrimônio.'),
    );
  });

  /* Escolher e desescolher a foto volta para a que estava gravada, não para o vazio. */
  it('goes back to the stored photo when the choice is undone (edge case)', () => {
    const model = mountModel(item());

    model.actions.onPhotoChange(file());
    expect(model.data.photo.previewUrl).toBe('blob:previa');

    model.actions.onPhotoChange(null);
    expect(model.data.photo.previewUrl).toBe('https://r2.exemplo/foto.webp');
  });
});
