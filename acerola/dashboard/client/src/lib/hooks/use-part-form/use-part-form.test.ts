import { type Part } from '@template/shared/schemas/part.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-part-form-harness.test.svelte';
import { type PartFormModel } from './use-part-form.svelte';

vi.mock('$lib/api/parts.api', () => ({
  partsApi: { create: vi.fn(), update: vi.fn() },
}));

const { partsApi } = await import('$lib/api/parts.api');

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

function mountModel(props: { part?: Part | null; onSaved?: () => void } = {}): PartFormModel {
  let model!: PartFormModel;
  render(Harness, {
    props: { ...props, onReady: (ready: PartFormModel) => (model = ready) },
  });

  return model;
}

describe('usePartFormModel', () => {
  beforeEach(() => {
    vi.mocked(partsApi.create).mockResolvedValue(part());
    vi.mocked(partsApi.update).mockResolvedValue(part());
  });

  // feliz
  it('registers the part with the quantity that is on the shelf today', async () => {
    const model = mountModel();

    model.actions.onChange('name', 'SSD 240 GB Kingston');
    model.actions.onChange('initialQuantity', '4');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(partsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'SSD 240 GB Kingston', initialQuantity: 4 }),
      ),
    );
  });

  /* Em branco é zero: a peça entra cadastrada, com a prateleira vazia. */
  it('reads a blank quantity as an empty shelf', async () => {
    const model = mountModel();

    model.actions.onChange('name', 'Mouse óptico USB');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(partsApi.create).toHaveBeenCalledWith(
        expect.objectContaining({ initialQuantity: 0 }),
      ),
    );
  });

  it('edits the existing part instead of creating another one', async () => {
    const model = mountModel({ part: part() });

    model.actions.onChange('name', 'SSD 480 GB Kingston');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(partsApi.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'SSD 480 GB Kingston' }),
      ),
    );
    expect(partsApi.create).not.toHaveBeenCalled();
  });

  /* Na edição a quantidade NÃO vai: o saldo só se move por entrada e saída. */
  it('never sends a quantity when fixing a part already registered', async () => {
    const model = mountModel({ part: part() });

    model.actions.onChange('initialQuantity', '99');
    model.actions.onSubmit();

    await waitFor(() => expect(partsApi.update).toHaveBeenCalled());
    expect(vi.mocked(partsApi.update).mock.calls[0]?.[1]).not.toHaveProperty('initialQuantity');
  });

  // triste
  it('refuses a part with no description, without calling the API', async () => {
    const model = mountModel();

    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.name.error).toBe('Informe o que é a peça'));
    expect(partsApi.create).not.toHaveBeenCalled();
  });

  it('refuses a quantity typed with letters', async () => {
    const model = mountModel();

    model.actions.onChange('name', 'Mouse');
    model.actions.onChange('initialQuantity', 'duas');
    model.actions.onSubmit();

    await waitFor(() => expect(model.data.fields.initialQuantity.error).not.toBeNull());
    expect(partsApi.create).not.toHaveBeenCalled();
  });

  it('shows why the server refused, keeping the form alive', async () => {
    vi.mocked(partsApi.create).mockRejectedValue(
      new ApiError(409, 'Já existe uma peça com essa descrição e essa condição.'),
    );
    const onSaved = vi.fn();
    const model = mountModel({ onSaved });

    model.actions.onChange('name', 'SSD 240 GB Kingston');
    model.actions.onSubmit();

    await waitFor(() =>
      expect(model.state.error).toBe('Já existe uma peça com essa descrição e essa condição.'),
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
});
