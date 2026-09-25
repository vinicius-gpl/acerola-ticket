import { type NetworkEvent } from '@template/shared/schemas/network-event.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-network-list-harness.test.svelte';
import { type NetworkListModel } from './use-network-list.svelte';

vi.mock('$lib/api/network.api', () => ({
  networkApi: { list: vi.fn(), summary: vi.fn(), resolve: vi.fn() },
}));

const { networkApi } = await import('$lib/api/network.api');

function event(over: Partial<NetworkEvent> = {}): NetworkEvent {
  return {
    id: 1,
    occurredAt: '2026-09-23T12:00:00.000Z',
    type: 'wan_down',
    severity: 'critical',
    title: 'WAN Offline',
    message: null,
    linkName: 'WAN1',
    provider: null,
    latencyMs: null,
    packetLossPercent: null,
    source: 'UniFi',
    resolvedAt: null,
    resolvedBy: null,
    createdAt: '2026-09-23T12:00:05.000Z',
    ...over,
  };
}

function mountModel(): NetworkListModel {
  let model!: NetworkListModel;
  render(Harness, { props: { onReady: (ready: NetworkListModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<NetworkListModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('useNetworkListModel', () => {
  beforeEach(() => {
    vi.mocked(networkApi.list).mockResolvedValue({
      items: [event()],
      total: 1,
      page: 1,
      pageSize: 200,
    });
    vi.mocked(networkApi.summary).mockResolvedValue({
      days: 30,
      open: 1,
      outages: 2,
      totalOutageSeconds: 1800,
      worstLatencyMs: 320,
      worstPacketLossPercent: 8,
    });
    vi.mocked(networkApi.resolve).mockResolvedValue(event({ resolvedAt: '2026-09-23T13:00:00.000Z' }));
  });

  // feliz
  it('opens on the last thirty days', async () => {
    await mountLoadedModel();

    expect(networkApi.list).toHaveBeenCalledWith(expect.objectContaining({ days: 30 }));
    expect(networkApi.summary).toHaveBeenCalledWith(30);
  });

  it('asks again when the period changes', async () => {
    const model = await mountLoadedModel();

    model.actions.onPeriodChange(7);

    await waitFor(() => expect(networkApi.summary).toHaveBeenCalledWith(7));
  });

  it('marks an event as resolved', async () => {
    const model = await mountLoadedModel();

    model.actions.onResolveChange(event(), true);

    await waitFor(() => expect(networkApi.resolve).toHaveBeenCalledWith(1, true));
  });

  // triste
  it('hands the screen the reason the list did not load', async () => {
    vi.mocked(networkApi.list).mockRejectedValue(new ApiError(500, 'O servidor tropeçou.'));

    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O servidor tropeçou.'));
  });

  /* A falha de RESOLVER é separada da falha de carregar: a lista continua na tela. */
  it('keeps the list on screen when the resolution is refused', async () => {
    vi.mocked(networkApi.resolve).mockRejectedValue(
      new ApiError(403, 'Seu perfil não permite alterar eventos de rede.'),
    );

    const model = await mountLoadedModel();
    model.actions.onResolveChange(event(), true);

    await waitFor(() =>
      expect(model.state.actionError).toBe('Seu perfil não permite alterar eventos de rede.'),
    );
    expect(model.data.events).toHaveLength(1);
    expect(model.state.error).toBeNull();
  });

  it('separates an empty period from a filter that hid everything', async () => {
    vi.mocked(networkApi.list).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 200 });

    const model = await mountLoadedModel();
    expect(model.state.isEmpty).toBe(true);

    model.actions.onOnlyOpenChange(true);

    await waitFor(() => expect(model.state.isFilteredOut).toBe(true));
    expect(model.state.isEmpty).toBe(false);
  });

  it('does not call the period empty while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });
});
