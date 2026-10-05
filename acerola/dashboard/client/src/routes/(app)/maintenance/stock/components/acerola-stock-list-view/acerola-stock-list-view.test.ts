import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import StockListView, { type StockListFilterValues } from './acerola-stock-list-view.svelte';

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 1,
    name: 'Café torrado e moído 500 g',
    category: 'pantry',
    unit: 'package',
    location: 'Copa',
    code: null,
    note: null,
    photoUrl: null,
    balance: 7,
    createdAt: '2026-09-01T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

const sugar = item({ id: 2, name: 'Açúcar refinado', unit: 'kilogram', balance: 0 });

const emptyFilter: StockListFilterValues = { search: '', category: '', outOfStockOnly: false };

const settled = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  isTruncated: false,
  error: null,
};

const actions = {
  onSearchChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onOutOfStockOnlyChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onEntry: vi.fn(),
  onExit: vi.fn(),
  onOpenInventory: vi.fn(),
};

function setup(props: Record<string, unknown> = {}) {
  return render(StockListView, {
    props: {
      data: { items: [item(), sugar], total: 2, outOfStock: 1, filter: emptyFilter },
      state: settled,
      actions,
      ...props,
    },
  });
}

/** O cartão de um produto, pelo nome dele. */
function cardOf(name: string): HTMLElement {
  return screen.getByRole('heading', { name }).closest('li') as HTMLElement;
}

describe('AcerolaStockListView', () => {
  // feliz
  it('shows how much there is of each product, in its measure', () => {
    setup();

    const coffee = within(cardOf('Café torrado e moído 500 g'));
    expect(coffee.getByText('7')).toBeInTheDocument();
    expect(coffee.getByText('Pacote')).toBeInTheDocument();
    expect(coffee.getByText('Mercadinho · Copa')).toBeInTheDocument();
    expect(screen.getByText(/2\s+produtos/)).toBeInTheDocument();
  });

  it('asks for an entry and for an exit of the product that was clicked', async () => {
    const onEntry = vi.fn();
    const onExit = vi.fn();
    setup({ actions: { ...actions, onEntry, onExit } });
    const coffee = within(cardOf('Café torrado e moído 500 g'));

    await userEvent.click(coffee.getByRole('button', { name: 'Entrada' }));
    await userEvent.click(coffee.getByRole('button', { name: 'Saída' }));

    expect(onEntry).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(onExit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  /* O que zerou fica marcado, e não dá para tirar de onde não há. */
  it('marks what ran out and does not offer to take from it', () => {
    setup();
    const card = within(cardOf('Açúcar refinado'));

    expect(card.getByText('Sem estoque')).toBeInTheDocument();
    expect(card.getByRole('button', { name: 'Saída' })).toBeDisabled();
    expect(card.getByRole('button', { name: 'Entrada' })).toBeEnabled();
  });

  it('offers to clear the filters only when there is one', async () => {
    const onClearFilters = vi.fn();
    const { unmount } = setup();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
    unmount();

    setup({
      data: {
        items: [sugar],
        total: 1,
        outOfStock: 1,
        filter: { ...emptyFilter, outOfStockOnly: true },
      },
      actions: { ...actions, onClearFilters },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  // triste
  it('says it is loading instead of saying there is nothing', () => {
    setup({
      data: { items: [], total: 0, outOfStock: 0, filter: emptyFilter },
      state: { ...settled, isLoading: true },
    });

    expect(screen.getByText('Carregando o depósito…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum produto para guardar ainda')).toBeNull();
  });

  /* Depósito vazio é inventário vazio: a saída é cadastrar o produto lá. */
  it('points to the inventory when there is no product at all', async () => {
    const onOpenInventory = vi.fn();
    setup({
      data: { items: [], total: 0, outOfStock: 0, filter: emptyFilter },
      state: { ...settled, isEmpty: true },
      actions: { ...actions, onOpenInventory },
    });

    await userEvent.click(screen.getByRole('button', { name: 'Abrir o inventário' }));

    expect(onOpenInventory).toHaveBeenCalledOnce();
  });

  it('separates the list hidden by a filter from the empty one', () => {
    setup({
      data: {
        items: [],
        total: 0,
        outOfStock: 0,
        filter: { ...emptyFilter, category: 'utility' },
      },
      state: { ...settled, isFilteredOut: true },
    });

    expect(screen.getByText('Nenhum produto com esse filtro')).toBeInTheDocument();
  });

  it('shows the reason of the failure and the way back', async () => {
    const onRetry = vi.fn();
    setup({
      data: { items: [], total: 0, outOfStock: 0, filter: emptyFilter },
      state: { ...settled, error: 'Não consegui falar com o servidor.' },
      actions: { ...actions, onRetry },
    });

    expect(screen.getByText('Não consegui falar com o servidor.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /tentar/i }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('says when the list came cut (edge case)', () => {
    setup({ state: { ...settled, isTruncated: true } });

    expect(screen.getByText(/mostra os primeiros produtos/)).toBeInTheDocument();
  });
});
