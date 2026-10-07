import { type MaintenanceDashboard } from '@template/shared/schemas/maintenance-dashboard.schema';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import MaintenanceDashboardView from './acerola-maintenance-dashboard-view.svelte';

const summary: MaintenanceDashboard = {
  inventory: { products: 14, outOfStock: 2 },
  quotes: { pending: 4, pendingAmountCents: 5643000, approvedAmountCents: 68000 },
  disposals: { units: 3 },
  recentMovements: [
    {
      id: 1,
      itemId: 4,
      itemName: 'Café torrado e moído 500 g',
      itemUnit: 'package',
      type: 'in',
      quantity: 4,
      balanceAfter: 7,
      reason: null,
      note: null,
      createdAt: '2026-09-29T12:00:00.000Z',
      createdBy: 'manutencao@azuos.local',
    },
    {
      id: 2,
      itemId: 1,
      itemName: 'Cadeira giratória',
      itemUnit: 'unit',
      type: 'disposal',
      quantity: 1,
      balanceAfter: 5,
      reason: 'broken',
      note: null,
      createdAt: '2026-09-15T12:00:00.000Z',
      createdBy: 'manutencao@azuos.local',
    },
  ],
};

const tickets = { open: 3, inProgress: 2, waiting: 1 };

const settled = { isLoading: false, isTicketsLoading: false, error: null };

const actions = {
  onRetry: vi.fn(),
  onOpenTickets: vi.fn(),
  onOpenStock: vi.fn(),
  onOpenQuotes: vi.fn(),
  onOpenDisposal: vi.fn(),
};

function setup(props: Record<string, unknown> = {}) {
  return render(MaintenanceDashboardView, {
    props: { data: { summary, tickets }, state: settled, actions, ...props },
  });
}

describe('AcerolaMaintenanceDashboardView', () => {
  // feliz
  it('shows what is waiting for Maintenance, each number with its explanation', () => {
    setup();

    expect(screen.getByText('Chamados abertos')).toBeInTheDocument();
    expect(screen.getByText('2 em andamento · 1 aguardando')).toBeInTheDocument();
    expect(screen.getByText('de 14 produtos')).toBeInTheDocument();
    expect(screen.getAllByText('R$ 56.430,00')).not.toHaveLength(0);
    expect(screen.getByText('R$ 680,00')).toBeInTheDocument();
    expect(screen.getByText('unidades')).toBeInTheDocument();
  });

  it('lists the last movements of the deposit, each with its kind', () => {
    setup();

    expect(screen.getByText('Café torrado e moído 500 g')).toBeInTheDocument();
    expect(screen.getByText('Entrada')).toBeInTheDocument();
    expect(screen.getByText('Descarte')).toBeInTheDocument();
    expect(screen.getByText(/4\s+pct · 29\/09\/2026/)).toBeInTheDocument();
  });

  /* O atalho diz para onde vai: cada botão tem o nome da tela. */
  it('takes each shortcut to its own screen', async () => {
    const handlers = {
      ...actions,
      onOpenTickets: vi.fn(),
      onOpenStock: vi.fn(),
      onOpenQuotes: vi.fn(),
      onOpenDisposal: vi.fn(),
    };
    setup({ actions: handlers });

    await userEvent.click(screen.getByRole('button', { name: 'Ver os chamados' }));
    await userEvent.click(screen.getByRole('button', { name: 'Abrir o depósito' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ver os orçamentos' }));
    await userEvent.click(screen.getByRole('button', { name: 'Ver os descartes' }));

    expect(handlers.onOpenTickets).toHaveBeenCalledOnce();
    expect(handlers.onOpenStock).toHaveBeenCalledOnce();
    expect(handlers.onOpenQuotes).toHaveBeenCalledOnce();
    expect(handlers.onOpenDisposal).toHaveBeenCalledOnce();
  });

  // triste
  /* Sem o resumo não há número: uma fileira de zeros faria parecer que está tudo em dia. */
  it('shows the reason of the failure instead of a row of zeros', async () => {
    const onRetry = vi.fn();
    setup({
      data: { summary: null, tickets },
      state: { ...settled, error: 'Não consegui falar com o servidor.' },
      actions: { ...actions, onRetry },
    });

    expect(screen.getByText('Não consegui falar com o servidor.')).toBeInTheDocument();
    expect(screen.queryByText('Chamados abertos')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: /tentar/i }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  /* Os chamados falharam: o cartão fica com traço, e o depósito continua na tela. */
  it('keeps the rest of the panel when the tickets did not come', () => {
    setup({ data: { summary, tickets: null } });

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('de 14 produtos')).toBeInTheDocument();
  });

  it('says nothing moved yet instead of showing an empty list', () => {
    setup({ data: { summary: { ...summary, recentMovements: [] }, tickets } });

    expect(screen.getByText(/Nada entrou nem saiu ainda/)).toBeInTheDocument();
  });

  it('does not draw the panels while the summary has not arrived', () => {
    setup({
      data: { summary: null, tickets: null },
      state: { isLoading: true, isTicketsLoading: true, error: null },
    });

    expect(screen.queryByText('Últimos movimentos do depósito')).toBeNull();
    expect(screen.getByText('Sem estoque')).toBeInTheDocument();
  });

  /* Uma unidade é "unidade": o plural errado é o detalhe que faz o painel parecer descuidado. */
  it('writes the singular when a single unit was discarded (edge case)', () => {
    setup({ data: { summary: { ...summary, disposals: { units: 1 } }, tickets } });

    expect(screen.getByText('unidade')).toBeInTheDocument();
  });
});
