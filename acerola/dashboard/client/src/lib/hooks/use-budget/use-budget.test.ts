import { type Budget, type BudgetNeed } from '@template/shared/schemas/budget.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-budget-harness.test.svelte';
import { type BudgetModel } from './use-budget.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$lib/api/budget.api', () => ({ budgetApi: { summary: vi.fn() } }));

const { budgetApi } = await import('$lib/api/budget.api');
const { goto } = await import('$app/navigation');

function need(over: Partial<BudgetNeed> = {}): BudgetNeed {
  return { key: 'memory', needed: 0, inStock: 0, toBuy: 0, machines: [], ...over };
}

const EMPTY: Budget = {
  needs: [need(), need({ key: 'disk' }), need({ key: 'computer' })],
};

function budgetWith(first: Partial<BudgetNeed>): Budget {
  return { needs: [need(first), need({ key: 'disk' }), need({ key: 'computer' })] };
}

function mountModel(): BudgetModel {
  let model!: BudgetModel;
  render(Harness, { props: { onReady: (ready: BudgetModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<BudgetModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('useBudgetModel', () => {
  beforeEach(() => {
    vi.mocked(budgetApi.summary).mockResolvedValue(
      budgetWith({ needed: 12, inStock: 4, toBuy: 8 }),
    );
    vi.mocked(goto).mockClear();
  });

  // feliz
  it('hands the screen what to buy', async () => {
    const model = await mountLoadedModel();

    expect(model.data.budget?.needs[0]?.toBuy).toBe(8);
  });

  it('opens the record of a machine that needs a part', async () => {
    const model = await mountLoadedModel();

    model.actions.onOpenMachine(42);

    expect(goto).toHaveBeenCalledWith('/computers/42');
  });

  it('opens the storeroom to check the shelf', async () => {
    const model = await mountLoadedModel();

    model.actions.onOpenParts();

    expect(goto).toHaveBeenCalledWith('/parts');
  });

  /* Precisar e o depósito cobrir é a boa notícia da tela, e não a mesma coisa que não
     precisar de nada. */
  it('recognises a need the storeroom already covers', async () => {
    vi.mocked(budgetApi.summary).mockResolvedValue(budgetWith({ needed: 3, inStock: 9, toBuy: 0 }));

    const model = await mountLoadedModel();

    expect(model.state.isCovered).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });

  // triste
  it('hands the screen the reason the data did not load', async () => {
    vi.mocked(budgetApi.summary).mockRejectedValue(new ApiError(500, 'O servidor tropeçou.'));

    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O servidor tropeçou.'));
  });

  it('recognises a park where nobody needs anything', async () => {
    vi.mocked(budgetApi.summary).mockResolvedValue(EMPTY);

    const model = await mountLoadedModel();

    expect(model.state.isEmpty).toBe(true);
    expect(model.state.isCovered).toBe(false);
  });

  /* Enquanto carrega não há notícia nenhuma a dar: anunciar "nada a comprar" antes da
     resposta faria a tela mudar de recado no meio do caminho. */
  it('calls nothing empty while the answer has not arrived', () => {
    const model = mountModel();

    expect(model.state.isEmpty).toBe(false);
    expect(model.state.isCovered).toBe(false);
  });
});
