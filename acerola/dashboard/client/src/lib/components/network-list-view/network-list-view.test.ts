import {
  type NetworkEvent,
  type NetworkSummary,
} from '@template/shared/schemas/network-event.schema';
import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import NetworkListView, {
  durationLabelOf,
  measuresOf,
  type NetworkFilter,
} from './network-list-view.svelte';

function event(over: Partial<NetworkEvent> = {}): NetworkEvent {
  return {
    id: 1,
    occurredAt: '2026-09-23T12:00:00.000Z',
    type: 'wan_down',
    severity: 'critical',
    title: 'WAN Offline',
    message: 'O link principal parou de responder.',
    linkName: 'WAN1',
    provider: 'Link principal',
    latencyMs: null,
    packetLossPercent: null,
    source: 'UniFi',
    resolvedAt: null,
    resolvedBy: null,
    createdAt: '2026-09-23T12:00:05.000Z',
    ...over,
  };
}

const summary: NetworkSummary = {
  days: 30,
  open: 2,
  outages: 3,
  totalOutageSeconds: 5400,
  worstLatencyMs: 320,
  worstPacketLossPercent: 8.1,
};

const emptyFilter: NetworkFilter = { type: '', severity: '', onlyOpen: false, days: 30 };

const actions = {
  onTypeChange: vi.fn(),
  onSeverityChange: vi.fn(),
  onOnlyOpenChange: vi.fn(),
  onPeriodChange: vi.fn(),
  onClearFilters: vi.fn(),
  onRetry: vi.fn(),
  onResolveChange: vi.fn(),
};

const settled: {
  isLoading: boolean;
  isEmpty: boolean;
  isFilteredOut: boolean;
  isTruncated: boolean;
  error: string | null;
} = { isLoading: false, isEmpty: false, isFilteredOut: false, isTruncated: false, error: null };

function renderView(
  over: {
    events?: NetworkEvent[];
    state?: Partial<typeof settled> & { actionError?: string | null };
  } = {},
) {
  return render(NetworkListView, {
    props: {
      data: {
        events: over.events ?? [event()],
        total: over.events?.length ?? 1,
        summary,
        filter: emptyFilter,
      },
      state: { ...settled, ...over.state },
      actions,
    },
  });
}

describe('durationLabelOf', () => {
  // feliz
  it('says how long the internet was out', () => {
    expect(durationLabelOf(event({ resolvedAt: '2026-09-23T12:42:00.000Z' }))).toBe('42 min');
  });

  // triste
  /* Sem fim, o problema está ACONTECENDO — e "0 min" diria que já passou. */
  it('says a problem with no end is still open', () => {
    expect(durationLabelOf(event())).toBe('Em aberto');
  });
});

describe('measuresOf', () => {
  // feliz
  it('reads the numbers that came with the alert', () => {
    expect(measuresOf(event({ latencyMs: 320.4, packetLossPercent: 8.14 }))).toBe(
      '320 ms · 8,1% de perda',
    );
  });

  // triste
  /* Nem todo aviso traz número: uma queda é uma queda, sem latência para medir. */
  it('is empty when the alert brought no number', () => {
    expect(measuresOf(event())).toBe('');
  });
});

describe('NetworkListView', () => {
  // feliz
  it('shows what happened, on which link and how bad it was', () => {
    renderView();

    const list = within(screen.getByRole('table'));

    expect(list.getByText('Internet caiu')).toBeInTheDocument();
    expect(list.getByText('WAN1')).toBeInTheDocument();
    expect(list.getByText('Grave')).toBeInTheDocument();
  });

  it('marks an open event as resolved', async () => {
    const user = userEvent.setup();
    renderView();

    await user.click(screen.getByRole('button', { name: 'Marcar como resolvido' }));

    expect(actions.onResolveChange).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }), true);
  });

  /* Resolver não apaga: o evento continua no histórico e pode ser reaberto. */
  it('offers to reopen an event that was already resolved', () => {
    renderView({ events: [event({ resolvedAt: '2026-09-23T12:42:00.000Z' })] });

    expect(screen.getByRole('button', { name: 'Reabrir' })).toBeInTheDocument();
  });

  // triste
  /* O silêncio não é notícia boa: o texto diz DE ONDE os eventos vêm. */
  it('explains where events come from when there is none', () => {
    renderView({ events: [], state: { isEmpty: true } });

    expect(screen.getByText('Nenhum evento no período')).toBeInTheDocument();
    expect(screen.getByText(/chegam do UniFi/)).toBeInTheDocument();
  });

  it('offers to clear the filters when they hid everything', () => {
    renderView({ events: [], state: { isFilteredOut: true } });

    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument();
  });

  it('shows the reason the list did not load', () => {
    renderView({ events: [], state: { error: 'Não consegui falar com o servidor.' } });

    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Não consegui falar com o servidor.');
  });

  it('does not announce an empty period while it is still loading', () => {
    renderView({ events: [], state: { isLoading: true } });

    expect(screen.getByText('Carregando os eventos…')).toBeInTheDocument();
    expect(screen.queryByText('Nenhum evento no período')).not.toBeInTheDocument();
  });
});
