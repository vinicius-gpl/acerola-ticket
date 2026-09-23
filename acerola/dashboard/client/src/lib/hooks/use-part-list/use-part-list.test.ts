import { type Part } from '@template/shared/schemas/part.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-part-list-harness.test.svelte';
import { summarizeParts, type PartListModel } from './use-part-list.svelte';

vi.mock('$lib/api/parts.api', () => ({
  partsApi: { list: vi.fn(), movements: vi.fn(), create: vi.fn() },
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

function page(items: Part[], total = items.length) {
  return { items, total, page: 1, pageSize: 200 };
}

function mountModel(): PartListModel {
  let model!: PartListModel;
  render(Harness, { props: { onReady: (ready: PartListModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<PartListModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('summarizeParts', () => {
  // feliz
  /* "Quantas peças temos" e "quantos tipos de peça temos" são perguntas diferentes, e
     trocar uma pela outra faria alguém comprar o que já tem. */
  it('counts the kinds and the items separately', () => {
    const summary = summarizeParts([part({ balance: 3 }), part({ id: 2, balance: 2 })]);

    expect(summary.kinds).toBe(2);
    expect(summary.items).toBe(5);
  });

  it('counts the parts whose shelf is empty', () => {
    const summary = summarizeParts([part({ balance: 0 }), part({ id: 2, balance: 4 })]);

    expect(summary.outOfStock).toBe(1);
  });

  // triste
  it('counts an empty storeroom as zero, not as missing', () => {
    expect(summarizeParts([])).toEqual({ kinds: 0, items: 0, outOfStock: 0 });
  });
});

describe('usePartListModel', () => {
  beforeEach(() => {
    vi.mocked(partsApi.list).mockResolvedValue(page([part()]));
  });

  // feliz
  it('brings the storeroom translated into the contract', async () => {
    const model = await mountLoadedModel();

    expect(model.data.parts).toHaveLength(1);
    expect(model.data.parts[0]?.balance).toBe(3);
  });

  it('asks the API again when the category filter changes', async () => {
    const model = await mountLoadedModel();

    model.actions.onCategoryChange('memory');

    await waitFor(() =>
      expect(partsApi.list).toHaveBeenCalledWith(expect.objectContaining({ category: 'memory' })),
    );
  });

  /* O filtro de estoque só entra na consulta quando alguém pede: a pergunta padrão da tela
     é "o que existe cadastrado", e não "o que dá para pegar agora". */
  it('only asks for what is in stock when the filter is turned on', async () => {
    const model = await mountLoadedModel();

    expect(partsApi.list).toHaveBeenCalledWith(
      expect.objectContaining({ inStockOnly: undefined }),
    );

    model.actions.onInStockOnlyChange(true);

    await waitFor(() =>
      expect(partsApi.list).toHaveBeenCalledWith(expect.objectContaining({ inStockOnly: true })),
    );
  });

  // triste
  it('hands the screen the reason the storeroom did not load', async () => {
    vi.mocked(partsApi.list).mockRejectedValue(new ApiError(500, 'O servidor tropeçou.'));

    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O servidor tropeçou.'));
  });

  it('separates an empty storeroom from a filter that hid everything', async () => {
    vi.mocked(partsApi.list).mockResolvedValue(page([]));

    const model = await mountLoadedModel();
    expect(model.state.isEmpty).toBe(true);

    model.actions.onSearchChange('placa de vídeo');

    await waitFor(() => expect(model.state.isFilteredOut).toBe(true));
    expect(model.state.isEmpty).toBe(false);
  });

  /* Vazio só é vazio DEPOIS que a consulta terminou. */
  it('does not call the storeroom empty while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });

  it('says the list was cut when more parts matched than came back', async () => {
    vi.mocked(partsApi.list).mockResolvedValue(page([part()], 240));

    const model = await mountLoadedModel();

    expect(model.state.isTruncated).toBe(true);
  });
});
