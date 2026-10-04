import { type Ticket } from '@template/shared/schemas/ticket.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { type TicketDashboard } from '$lib/api/tickets.api';
import TicketListView, { formatAverage, type TicketListFilter } from './acerola-ticket-list-view.svelte';

function ticket(over: Partial<Ticket> = {}): Ticket {
  return {
    id: 1,
    protocol: 'CH-0001',
    status: 'open',
    priority: 'high',
    requesterName: 'Bia Costa',
    area: 'infra',
    department: 'financeiro',
    problemType: 'printer',
    participantAreas: [],
    anydeskId: null,
    contactPhone: '62999990001',
    notifyWhatsapp: true,
    description: 'A impressora não puxa papel.',
    screenshotUrl: null,
    computerId: null,
    computerName: null,
    assignee: null,
    solution: null,
    createdAt: '2026-09-15T12:10:00.000Z',
    startedAt: null,
    resolvedAt: null,
    updatedAt: null,
    updatedBy: null,
    ...over,
  };
}

const dashboard: TicketDashboard = {
  total: 12,
  open: 5,
  inProgress: 2,
  resolved: 4,
  cancelled: 1,
  averageResolutionHours: 1.8,
  byProblemType: [{ key: 'printer', count: 4 }],
  byDepartment: [{ key: 'financeiro', count: 4 }],
};

const emptyFilter: TicketListFilter = {
  search: '',
  status: '',
  priority: '',
  department: '',
  problemType: '',
};

const actions = {
  onSearchChange: vi.fn(),
  onStatusChange: vi.fn(),
  onPriorityChange: vi.fn(),
  onDepartmentChange: vi.fn(),
  onProblemTypeChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onAnswer: vi.fn(),
  onExportReport: vi.fn(),
};

const settled = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  isTruncated: false,
  error: null,
};

function setup(props: Record<string, unknown> = {}) {
  return render(TicketListView, {
    props: {
      data: { tickets: [ticket()], total: 1, dashboard, filter: emptyFilter },
      state: settled,
      actions,
      ...props,
    },
  });
}

describe('formatAverage', () => {
  // feliz
  it('reads hours with one decimal, in the Brazilian comma', () => {
    expect(formatAverage(1.8)).toBe('1,8 h');
  });

  it('switches to minutes below an hour, because "0,3 h" nobody reads', () => {
    expect(formatAverage(0.5)).toBe('30 min');
  });

  // triste
  /* Zero anunciaria atendimento instantâneo num sistema que nunca resolveu nada. */
  it('shows a dash when nothing was resolved yet, never zero', () => {
    expect(formatAverage(null)).toBe('—');
    expect(formatAverage(undefined)).toBe('—');
  });
});

describe('AcerolaTicketListView — stat card shortcuts and filter bar', () => {
  // feliz
  it('filters the queue by situation when a stat card is clicked', async () => {
    const onStatusChange = vi.fn();
    setup({ actions: { ...actions, onStatusChange } });

    await userEvent.click(screen.getByRole('button', { name: 'Abertos: filtrar a lista' }));
    expect(onStatusChange).toHaveBeenLastCalledWith('open');

    await userEvent.click(screen.getByRole('button', { name: 'Em atendimento: filtrar a lista' }));
    expect(onStatusChange).toHaveBeenLastCalledWith('in_progress');

    await userEvent.click(screen.getByRole('button', { name: 'Resolvidos: filtrar a lista' }));
    expect(onStatusChange).toHaveBeenLastCalledWith('resolved');
  });

  it('marks the card whose filter is on, and clicking it again clears the filter', async () => {
    const onStatusChange = vi.fn();
    setup({
      data: { tickets: [ticket()], total: 1, dashboard, filter: { ...emptyFilter, status: 'open' } },
      actions: { ...actions, onStatusChange },
    });

    const card = screen.getByRole('button', { name: 'Abertos: tirar o filtro' });
    expect(card).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(card);
    expect(onStatusChange).toHaveBeenLastCalledWith('');
  });

  it('names each filter and offers to clear them once one is on', async () => {
    const onClearFilters = vi.fn();
    setup({
      data: {
        tickets: [ticket()],
        total: 1,
        dashboard,
        filter: { ...emptyFilter, priority: 'high' },
      },
      actions: { ...actions, onClearFilters },
    });

    /* "Situação" e "Departamento" também são títulos de coluna da tabela: basta existir. */
    for (const label of ['Situação', 'Urgência', 'Departamento', 'Tipo de problema'])
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(onClearFilters).toHaveBeenCalled();
  });

  // triste
  /* O tempo médio não corresponde a nenhum filtro: não pode parecer clicável. */
  it('does not turn the average-time card into a shortcut', () => {
    setup();

    expect(screen.queryByRole('button', { name: /Tempo médio/ })).toBeNull();
  });

  it('hides the clear button while no filter is on', () => {
    setup();

    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).toBeNull();
  });
});

describe('AcerolaTicketListView', () => {
  // feliz
  it('lists the ticket with its protocol and situation', () => {
    setup();

    const table = screen.getByRole('table');

    expect(within(table).getByText('CH-0001')).toBeInTheDocument();
    expect(within(table).getByText('Bia Costa')).toBeInTheDocument();
    /* "Aberto" também é o rótulo da pastilha de filtro, fora da tabela — daí restringir a
       busca à tabela, em vez de pegar o primeiro "Aberto" da tela inteira. */
    expect(within(table).getByText('Aberto')).toBeInTheDocument();
  });

  it('asks to attend the ticket that was clicked', async () => {
    const onAnswer = vi.fn();
    const only = ticket({ id: 42, protocol: 'CH-0042' });
    setup({
      data: { tickets: [only], total: 1, dashboard, filter: emptyFilter },
      actions: { ...actions, onAnswer },
    });

    await userEvent.click(screen.getAllByRole('button', { name: /atender/i })[0]!);

    expect(onAnswer).toHaveBeenCalledWith(only);
  });

  it('shows the indicators over every ticket, not only the ones listed', () => {
    setup();

    expect(screen.getByText('1,8 h')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  // triste
  /* Chamado sai da fila mudando de situação, nunca sumindo. */
  it('offers no way to delete a ticket', () => {
    setup();

    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });

  it('says nothing exists yet without blaming a filter', () => {
    setup({
      data: { tickets: [], total: 0, dashboard, filter: emptyFilter },
      state: { ...settled, isEmpty: true },
    });

    expect(screen.getByText(/nenhum chamado ainda/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /limpar filtros/i })).not.toBeInTheDocument();
  });

  it('offers to clear the filters when they hid everything', async () => {
    const onClearFilters = vi.fn();
    setup({
      data: { tickets: [], total: 0, dashboard, filter: { ...emptyFilter, status: 'resolved' } },
      state: { ...settled, isFilteredOut: true },
      actions: { ...actions, onClearFilters },
    });

    await userEvent.click(screen.getByRole('button', { name: /limpar filtros/i }));

    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  /* Mostrar "nenhum chamado" durante o carregamento faz a pessoa achar que os dados sumiram. */
  it('does not claim the queue is empty while it is still loading', () => {
    setup({
      data: { tickets: [], total: 0, dashboard: null, filter: emptyFilter },
      state: { ...settled, isLoading: true },
    });

    expect(screen.queryByText(/nenhum chamado ainda/i)).not.toBeInTheDocument();
    expect(screen.getByText(/carregando os chamados/i)).toBeInTheDocument();
  });

  it('shows the failure with a way to try again', () => {
    setup({
      data: { tickets: [], total: 0, dashboard: null, filter: emptyFilter },
      state: { ...settled, error: 'Não consegui falar com o servidor.' },
    });

    expect(screen.getByText(/não consegui falar com o servidor/i)).toBeInTheDocument();
  });

  /* Truncar calado é mentir sobre o tamanho da fila. */
  it('says how many were left out when the page does not hold everything', () => {
    setup({
      data: { tickets: [ticket()], total: 240, dashboard, filter: emptyFilter },
      state: { ...settled, isTruncated: true },
    });

    expect(screen.getByText(/mostrando 1 de 240 chamados/i)).toBeInTheDocument();
  });

  it('renders mobile cards and desktop table with proper responsive display classes', () => {
    const { container } = setup();

    const mobileCards = container.querySelector('[data-slot="ticket-cards-mobile"]');
    const desktopTable = container.querySelector('[data-slot="ticket-table-desktop"]');

    expect(mobileCards).toBeInTheDocument();
    expect(desktopTable).toBeInTheDocument();
    expect(mobileCards?.classList.contains('xl:hidden')).toBe(true);
    expect(desktopTable?.classList.contains('hidden')).toBe(true);
    expect(desktopTable?.classList.contains('xl:block')).toBe(true);
  });

  it('renders pagination bar and notifies page changes', async () => {
    const onPageChange = vi.fn();
    setup({
      data: {
        tickets: [ticket()],
        total: 30,
        dashboard,
        filter: emptyFilter,
        paging: { page: 1, pageSize: 15, total: 30 },
      },
      actions: { ...actions, onPageChange },
    });

    expect(screen.getByText(/1–15 de 30 chamados/i)).toBeInTheDocument();
    const nextBtn = screen.getByRole('button', { name: /próxima/i });
    expect(nextBtn).toBeInTheDocument();

    await userEvent.click(nextBtn);
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
