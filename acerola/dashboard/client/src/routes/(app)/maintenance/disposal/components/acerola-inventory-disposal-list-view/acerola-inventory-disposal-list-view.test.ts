import { type InventoryMovement } from '@template/shared/schemas/inventory-movement.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import InventoryDisposalListView from './acerola-inventory-disposal-list-view.svelte';

function disposal(overrides: Partial<InventoryMovement> = {}): InventoryMovement {
  return {
    id: 1,
    itemId: 1,
    itemName: 'Cadeira giratória',
    itemUnit: 'unit',
    type: 'disposal',
    quantity: 2,
    balanceAfter: 5,
    reason: 'broken',
    note: 'Base rachou; sem conserto.',
    createdAt: '2026-09-15T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    ...overrides,
  };
}

const noFilter = { reason: '' as const };

const settled = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  isTruncated: false,
  error: null,
};

const actions = {
  onReasonChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onRegister: vi.fn(),
};

function setup(props: Record<string, unknown> = {}) {
  return render(InventoryDisposalListView, {
    props: {
      data: { disposals: [disposal()], total: 1, units: 2, filter: noFilter },
      state: settled,
      actions,
      ...props,
    },
  });
}

describe('AcerolaInventoryDisposalListView', () => {
  // feliz
  it('shows what was discarded, how much, why and what was left', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'Cadeira giratória' })).toBeInTheDocument();
    /* `^…$`: "2 un" é a quantidade do cartão; "2 unidades" é o resumo no alto da lista. */
    expect(screen.getByText(/^2\s+un$/)).toBeInTheDocument();
    /* Dentro do CARTÃO: "Quebrou" também é uma opção do filtro, no alto da tela. */
    const card = screen.getByRole('heading', { name: 'Cadeira giratória' }).closest('li');
    expect(within(card as HTMLElement).getByText('Quebrou')).toBeInTheDocument();
    expect(screen.getByText('Base rachou; sem conserto.')).toBeInTheDocument();
    expect(screen.getByText(/ficaram\s+5 no depósito/)).toBeInTheDocument();
  });

  /* Linhas e unidades são números diferentes, e os dois aparecem. */
  it('sums up the lines and the units', () => {
    setup({
      data: {
        disposals: [disposal(), disposal({ id: 2, quantity: 1 })],
        total: 2,
        units: 3,
        filter: noFilter,
      },
    });

    expect(screen.getByText('2 descartes · 3 unidades')).toBeInTheDocument();
  });

  it('asks to register another disposal', async () => {
    const onRegister = vi.fn();
    setup({ actions: { ...actions, onRegister } });

    await userEvent.click(screen.getByRole('button', { name: 'Registrar descarte' }));

    expect(onRegister).toHaveBeenCalledOnce();
  });

  it('offers to clear the filter only when a reason is chosen', async () => {
    const onClearFilters = vi.fn();
    const { unmount } = setup();
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
    unmount();

    setup({
      data: { disposals: [disposal()], total: 1, units: 2, filter: { reason: 'broken' } },
      actions: { ...actions, onClearFilters },
    });
    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));

    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  // triste
  it('says it is loading instead of saying there is nothing', () => {
    setup({
      data: { disposals: [], total: 0, units: 0, filter: noFilter },
      state: { ...settled, isLoading: true },
    });

    expect(screen.getByText('Carregando os descartes…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum descarte registrado')).toBeNull();
  });

  it('separates nothing discarded from nothing for that reason', () => {
    const { unmount } = setup({
      data: { disposals: [], total: 0, units: 0, filter: noFilter },
      state: { ...settled, isEmpty: true },
    });
    expect(screen.getByText('Nenhum descarte registrado')).toBeInTheDocument();
    unmount();

    setup({
      data: { disposals: [], total: 0, units: 0, filter: { reason: 'lost' } },
      state: { ...settled, isFilteredOut: true },
    });
    expect(screen.getByText('Nenhum descarte por esse motivo')).toBeInTheDocument();
  });

  it('shows the reason of the failure and the way back', async () => {
    const onRetry = vi.fn();
    setup({
      data: { disposals: [], total: 0, units: 0, filter: noFilter },
      state: { ...settled, error: 'Não consegui falar com o servidor.' },
      actions: { ...actions, onRetry },
    });

    expect(screen.getByText('Não consegui falar com o servidor.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /tentar/i }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  /* Descarte sem observação não ganha um parágrafo vazio. */
  it('shows no note when there is none (edge case)', () => {
    setup({
      data: {
        disposals: [disposal({ note: null })],
        total: 1,
        units: 2,
        filter: noFilter,
      },
    });

    expect(screen.queryByText('Base rachou; sem conserto.')).toBeNull();
  });
});
