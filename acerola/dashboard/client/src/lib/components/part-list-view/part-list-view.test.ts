import { type Part } from '@template/shared/schemas/part.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import PartListView, { type PartListFilter, type PartSummary } from './part-list-view.svelte';

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

const summary: PartSummary = { kinds: 8, items: 23, outOfStock: 1 };

const emptyFilter: PartListFilter = {
  search: '',
  category: '',
  condition: '',
  inStockOnly: false,
};

const actions = {
  onSearchChange: vi.fn(),
  onCategoryChange: vi.fn(),
  onConditionChange: vi.fn(),
  onInStockOnlyChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onRegister: vi.fn(),
  onEdit: vi.fn(),
  onMove: vi.fn(),
  onOpenLedger: vi.fn(),
};

const settled: {
  isLoading: boolean;
  isEmpty: boolean;
  isFilteredOut: boolean;
  isTruncated: boolean;
  error: string | null;
} = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  isTruncated: false,
  error: null,
};

function renderView(
  over: { parts?: Part[]; state?: Partial<typeof settled> } = {},
) {
  return render(PartListView, {
    props: {
      data: {
        parts: over.parts ?? [part()],
        total: over.parts?.length ?? 1,
        summary,
        filter: emptyFilter,
      },
      state: { ...settled, ...over.state },
      actions,
    },
  });
}

describe('PartListView', () => {
  // feliz
  it('shows the part with its condition and what is on the shelf', () => {
    renderView();

    expect(screen.getByText('SSD 240 GB Kingston')).toBeInTheDocument();
    expect(screen.getByText('Nova')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('opens the entry form for that part', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: 'Entrada' }));

    expect(actions.onMove).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), 'in');
  });

  it('opens the ledger from the part name', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: 'SSD 240 GB Kingston' }));

    expect(actions.onOpenLedger).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  // triste
  /* Prateleira vazia NÃO some da lista: é por ela que alguém descobre o que comprar. */
  it('keeps a part with an empty shelf on the list', () => {
    renderView({ parts: [part({ balance: 0 })] });

    expect(screen.getByText('SSD 240 GB Kingston')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  /* Sem peça não há saída possível: o botão trava antes de a pessoa levar uma recusa. */
  it('blocks the exit button when there is nothing to take', () => {
    renderView({ parts: [part({ balance: 0 })] });

    expect(screen.getByRole('button', { name: 'Saída' })).toBeDisabled();
  });

  it('shows the reason the storeroom did not load', () => {
    renderView({ state: { error: 'Não consegui falar com o servidor.' } });

    expect(screen.getByRole('alert')).toHaveTextContent('Não consegui falar com o servidor.');
  });

  it('separates an empty storeroom from a filter that hid everything', () => {
    renderView({ parts: [], state: { isEmpty: true } });

    expect(screen.getByText('Nenhuma peça cadastrada')).toBeInTheDocument();
  });

  it('offers to clear the filters when they hid everything', () => {
    renderView({ parts: [], state: { isFilteredOut: true } });

    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('does not announce an empty storeroom while it is still loading', () => {
    renderView({ parts: [], state: { isLoading: true } });

    expect(screen.getByText('Carregando as peças…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhuma peça cadastrada')).not.toBeInTheDocument();
  });

  /* Truncar calado é mentir sobre o tamanho do depósito. */
  it('says the list was cut instead of hiding it', () => {
    render(PartListView, {
      props: {
        data: { parts: [part()], total: 240, summary, filter: emptyFilter },
        state: { ...settled, isTruncated: true },
        actions,
      },
    });

    expect(screen.getByText(/Mostrando 1 de 240 peças/)).toBeInTheDocument();
  });
});
