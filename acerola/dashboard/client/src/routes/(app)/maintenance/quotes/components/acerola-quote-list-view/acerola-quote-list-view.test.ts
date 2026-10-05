import { type MaintenanceQuote } from '@template/shared/schemas/maintenance-quote.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import QuoteListView, { type QuoteListFilterValues } from './acerola-quote-list-view.svelte';

function quote(overrides: Partial<MaintenanceQuote> = {}): MaintenanceQuote {
  return {
    id: 1,
    supplier: 'Clima Norte Refrigeração',
    description: 'Limpeza e recarga de gás dos aparelhos de ar-condicionado',
    kind: 'service',
    amountCents: 96000,
    quotedOn: '2026-10-02',
    status: 'pending',
    note: 'Inclui a troca do filtro.',
    attachmentUrl: 'https://r2.exemplo/doc?assinatura',
    attachmentName: 'orcamento-clima-norte.pdf',
    createdAt: '2026-10-02T12:00:00.000Z',
    createdBy: 'manutencao@azuos.local',
    updatedAt: null,
    updatedBy: null,
    ...overrides,
  };
}

const emptyFilter: QuoteListFilterValues = { search: '', status: '', kind: '' };

const settled = {
  isLoading: false,
  isEmpty: false,
  isFilteredOut: false,
  isTruncated: false,
  error: null,
};

const actions = {
  onSearchChange: vi.fn(),
  onStatusChange: vi.fn(),
  onKindChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onRegister: vi.fn(),
  onEdit: vi.fn(),
  onAskDelete: vi.fn(),
  onCancelDelete: vi.fn(),
  onConfirmDelete: vi.fn(),
};

function setup(props: Record<string, unknown> = {}) {
  return render(QuoteListView, {
    props: {
      data: {
        quotes: [quote()],
        total: 1,
        amountCents: 96000,
        filter: emptyFilter,
        deleting: null,
      },
      state: settled,
      actions,
      ...props,
    },
  });
}

describe('AcerolaQuoteListView', () => {
  // feliz
  it('shows the quote with its company, kind, day, amount and status', () => {
    setup();

    expect(screen.getByRole('heading', { name: 'Clima Norte Refrigeração' })).toBeInTheDocument();
    expect(screen.getByText('Serviço · 02/10/2026')).toBeInTheDocument();
    expect(screen.getByText('R$ 960,00')).toBeInTheDocument();
    /* Dentro do CARTÃO: "Aguardando" também é uma opção do filtro, no alto da tela. */
    const card = screen.getByRole('heading', { name: 'Clima Norte Refrigeração' }).closest('li');
    expect(within(card as HTMLElement).getByText('Aguardando')).toBeInTheDocument();
    expect(screen.getByText('Inclui a troca do filtro.')).toBeInTheDocument();
    expect(screen.getByText('1 orçamento · R$ 960,00')).toBeInTheDocument();
  });

  /* O documento abre em outra aba, pelo link assinado que veio do servidor. */
  it('links to the document that the company sent', () => {
    setup();

    const link = screen.getByRole('link', { name: 'orcamento-clima-norte.pdf' });
    expect(link).toHaveAttribute('href', 'https://r2.exemplo/doc?assinatura');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('asks to keep, to correct and to delete', async () => {
    const onRegister = vi.fn();
    const onEdit = vi.fn();
    const onAskDelete = vi.fn();
    setup({ actions: { ...actions, onRegister, onEdit, onAskDelete } });

    await userEvent.click(screen.getByRole('button', { name: 'Guardar orçamento' }));
    await userEvent.click(screen.getByRole('button', { name: 'Corrigir' }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));

    expect(onRegister).toHaveBeenCalledOnce();
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    expect(onAskDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
  });

  it('asks before deleting, naming the company', () => {
    setup({
      data: {
        quotes: [quote()],
        total: 1,
        amountCents: 96000,
        filter: emptyFilter,
        deleting: quote(),
      },
    });

    expect(
      screen.getByText(/O orçamento de "Clima Norte Refrigeração" sai da lista/),
    ).toBeInTheDocument();
  });

  // triste
  it('says there is no document instead of linking to nothing', () => {
    setup({
      data: {
        quotes: [quote({ attachmentUrl: null, attachmentName: null })],
        total: 1,
        amountCents: 96000,
        filter: emptyFilter,
        deleting: null,
      },
    });

    expect(screen.getByText('Sem documento')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('says it is loading instead of saying there is nothing', () => {
    setup({
      data: { quotes: [], total: 0, amountCents: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, isLoading: true },
    });

    expect(screen.getByText('Carregando os orçamentos…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum orçamento guardado ainda')).toBeNull();
  });

  it('separates no quote at all from none with that filter', async () => {
    const onClearFilters = vi.fn();
    const { unmount } = setup({
      data: { quotes: [], total: 0, amountCents: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, isEmpty: true },
    });
    expect(screen.getByText('Nenhum orçamento guardado ainda')).toBeInTheDocument();
    unmount();

    setup({
      data: {
        quotes: [],
        total: 0,
        amountCents: 0,
        filter: { ...emptyFilter, status: 'rejected' },
        deleting: null,
      },
      state: { ...settled, isFilteredOut: true },
      actions: { ...actions, onClearFilters },
    });
    expect(screen.getByText('Nenhum orçamento com esse filtro')).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Limpar filtros' })[0]!);

    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('shows the reason of the failure and the way back', async () => {
    const onRetry = vi.fn();
    setup({
      data: { quotes: [], total: 0, amountCents: 0, filter: emptyFilter, deleting: null },
      state: { ...settled, error: 'Não consegui falar com o servidor.' },
      actions: { ...actions, onRetry },
    });

    expect(screen.getByText('Não consegui falar com o servidor.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /tentar/i }));

    expect(onRetry).toHaveBeenCalledOnce();
  });

  /* Valor zero é valor: a visita sem custo aparece como R$ 0,00, não como traço. */
  it('shows a quote of zero as zero (edge case)', () => {
    setup({
      data: {
        quotes: [quote({ amountCents: 0, note: null })],
        total: 1,
        amountCents: 0,
        filter: emptyFilter,
        deleting: null,
      },
    });

    expect(screen.getByText('R$ 0,00')).toBeInTheDocument();
  });
});
