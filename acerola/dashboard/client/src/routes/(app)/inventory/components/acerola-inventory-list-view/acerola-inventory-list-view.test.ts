import { type InventoryItem } from '@template/shared/schemas/inventory-item.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import InventoryListView, {
  type InventoryListFilterValues,
} from './acerola-inventory-list-view.svelte';

function item(overrides: Partial<InventoryItem> = {}): InventoryItem {
  return {
    id: 1,
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
    ...overrides,
  };
}

const emptyFilter: InventoryListFilterValues = {
  search: '',
  category: '',
  withoutPhotoOnly: false,
};

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
  onWithoutPhotoOnlyChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onRegister: vi.fn(),
  onEdit: vi.fn(),
  onAskDelete: vi.fn(),
  onCancelDelete: vi.fn(),
  onConfirmDelete: vi.fn(),
};

function setup(props: Record<string, unknown> = {}) {
  return render(InventoryListView, {
    props: {
      data: { items: [item()], total: 1, filter: emptyFilter, deleting: null },
      state: settled,
      actions,
      ...props,
    },
  });
}

describe('AcerolaInventoryListView', () => {
  // feliz
  it('shows the product with its category, place and measure', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'Cadeira giratória' })).toBeInTheDocument();
    expect(screen.getByText('Mobiliário')).toBeInTheDocument();
    expect(screen.getByText('Sala da contabilidade · Unidade')).toBeInTheDocument();
    expect(screen.getByText('PAT-0101')).toBeInTheDocument();
  });

  /* A foto é o que faz reconhecer o produto antes de ler o nome. */
  it('shows the photo of the product', () => {
    setup();

    expect(screen.getByRole('img', { name: 'Foto de Cadeira giratória' })).toHaveAttribute(
      'src',
      'https://r2.exemplo/foto.webp',
    );
  });

  it('asks to register a new product', async () => {
    const onRegister = vi.fn();
    setup({ actions: { ...actions, onRegister } });

    await userEvent.click(screen.getByRole('button', { name: 'Cadastrar produto' }));

    expect(onRegister).toHaveBeenCalledOnce();
  });

  it('asks to correct and to delete the product that was clicked', async () => {
    const onEdit = vi.fn();
    const onAskDelete = vi.fn();
    setup({ actions: { ...actions, onEdit, onAskDelete } });

    await userEvent.click(screen.getByRole('button', { name: 'Corrigir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(onAskDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  /* Excluir é irreversível: a pergunta traz o nome do produto, não um "tem certeza?" solto. */
  it('names the product in the deletion question', () => {
    setup({ data: { items: [item()], total: 1, filter: emptyFilter, deleting: item() } });

    expect(screen.getByText(/"Cadeira giratória" sai do inventário/)).toBeInTheDocument();
  });

  // triste
  it('does not claim the inventory is empty while it is still loading', () => {
    setup({
      data: { items: [], total: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, isLoading: true },
    });

    expect(screen.getByText('Carregando o inventário…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum produto cadastrado ainda')).toBeNull();
  });

  it('says nothing exists yet without blaming a filter', () => {
    setup({
      data: { items: [], total: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, isEmpty: true },
    });

    expect(screen.getByText('Nenhum produto cadastrado ainda')).toBeInTheDocument();
  });

  /* Vazio de verdade e vazio por filtro são frases diferentes, com saídas diferentes. */
  it('offers to clear the filters when they hid everything', async () => {
    const onClearFilters = vi.fn();
    setup({
      data: {
        items: [],
        total: 0,
        filter: { ...emptyFilter, category: 'utility' },
        deleting: null,
      },
      state: { ...settled, isFilteredOut: true },
      actions: { ...actions, onClearFilters },
    });

    expect(screen.getByText('Nenhum produto com esse filtro')).toBeInTheDocument();

    const [clearButton] = screen.getAllByRole('button', { name: 'Limpar filtros' });
    await userEvent.click(clearButton as HTMLElement);
    expect(onClearFilters).toHaveBeenCalled();
  });

  it('shows the failure with a way to try again', async () => {
    const onRetry = vi.fn();
    setup({
      data: { items: [], total: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, error: 'Não consegui falar com o servidor.' },
      actions: { ...actions, onRetry },
    });

    expect(screen.getByText('Não consegui falar com o servidor.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Tentar de novo/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  /* Produto sem foto, sem lugar e sem código continua legível: é metade do cadastro real. */
  it('draws a product with nothing but a name (edge case)', () => {
    setup({
      data: {
        items: [item({ photoUrl: null, location: null, code: null, name: 'Extintor' })],
        total: 1,
        filter: emptyFilter,
        deleting: null,
      },
    });

    expect(screen.getByRole('heading', { name: 'Extintor' })).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('Unidade')).toBeInTheDocument();
  });

  /* Lista truncada nunca é truncada calada (CONTRIBUTING §15). */
  it('says when the list does not show everything', () => {
    setup({ state: { ...settled, isTruncated: true } });

    expect(screen.getByText(/primeiros produtos/)).toBeInTheDocument();
  });
});
