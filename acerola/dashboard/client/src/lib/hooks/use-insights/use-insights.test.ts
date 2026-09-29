import { type Insights } from '@template/shared/schemas/insight.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-insights-harness.test.svelte';
import { type InsightsModel } from './use-insights.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$lib/api/insights.api', () => ({ insightsApi: { summary: vi.fn() } }));

const { insightsApi } = await import('$lib/api/insights.api');
const { goto } = await import('$app/navigation');

const EMPTY: Insights = {
  days: 30,
  overloaded: [],
  upgrades: [],
  troublesome: [],
  spares: [],
};

function mountModel(): InsightsModel {
  let model!: InsightsModel;
  render(Harness, { props: { onReady: (ready: InsightsModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<InsightsModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('useInsightsModel', () => {
  beforeEach(() => {
    vi.mocked(insightsApi.summary).mockResolvedValue({
      ...EMPTY,
      spares: [
        {
          computerId: 5,
          computerName: 'COMERCIAL-05',
          computerDisplayName: null,
          department: null,
          healthScore: 100,
          healthStatus: 'good',
          memoryGb: 16,
          diskGb: 512,
          cpuModel: null,
          lastSeenAt: null,
        },
      ],
    });
    vi.mocked(goto).mockClear();
  });

  // feliz
  it('opens on the last thirty days', async () => {
    await mountLoadedModel();

    expect(insightsApi.summary).toHaveBeenCalledWith(30);
  });

  it('asks again when the period changes', async () => {
    const model = await mountLoadedModel();

    model.actions.onPeriodChange(90);

    await waitFor(() => expect(insightsApi.summary).toHaveBeenCalledWith(90));
    expect(model.data.days).toBe(90);
  });

  it('opens the record of a machine from a recommendation', async () => {
    const model = await mountLoadedModel();

    model.actions.onOpenMachine(42);

    expect(goto).toHaveBeenCalledWith('/computers/42');
  });

  // triste
  it('hands the screen the reason the data did not load', async () => {
    vi.mocked(insightsApi.summary).mockRejectedValue(new ApiError(500, 'O servidor tropeçou.'));

    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O servidor tropeçou.'));
  });

  /* Um parque saudável COM máquinas tem o que dizer (as reservas): só é vazio quando não há
     máquina nenhuma. */
  it('does not call a healthy park empty while it still has spares', async () => {
    const model = await mountLoadedModel();

    expect(model.state.isEmpty).toBe(false);
  });

  it('recognises a park with no machines as empty', async () => {
    vi.mocked(insightsApi.summary).mockResolvedValue(EMPTY);

    const model = await mountLoadedModel();

    expect(model.state.isEmpty).toBe(true);
  });
});
