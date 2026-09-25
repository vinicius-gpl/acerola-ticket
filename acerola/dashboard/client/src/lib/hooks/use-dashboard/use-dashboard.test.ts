import { type Dashboard } from '@template/shared/schemas/dashboard.schema';
import { render, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '$lib/api/http-client';
import Harness from './use-dashboard-harness.test.svelte';
import { type DashboardModel } from './use-dashboard.svelte';

vi.mock('$app/navigation', () => ({ goto: vi.fn() }));

vi.mock('$lib/api/dashboard.api', () => ({
  dashboardApi: { summary: vi.fn() },
}));

const { dashboardApi } = await import('$lib/api/dashboard.api');
const { goto } = await import('$app/navigation');

function summary(over: Partial<Dashboard> = {}): Dashboard {
  return {
    days: 30,
    park: { total: 7, critical: 1, attention: 1, neverSeen: 1 },
    tickets: {
      open: 5,
      inProgress: 2,
      openedInPeriod: 12,
      resolvedInPeriod: 5,
      averageResolutionHours: 1.8,
    },
    maintenance: { doneInPeriod: 4, preventiveDue: 5 },
    parts: { kinds: 8, items: 23, outOfStock: 1 },
    worstMachines: [],
    byProblemType: [],
    byDepartment: [],
    ...over,
  };
}

function mountModel(): DashboardModel {
  let model!: DashboardModel;
  render(Harness, { props: { onReady: (ready: DashboardModel) => (model = ready) } });

  return model;
}

async function mountLoadedModel(): Promise<DashboardModel> {
  const model = mountModel();
  await waitFor(() => expect(model.state.isLoading).toBe(false));

  return model;
}

describe('useDashboardModel', () => {
  beforeEach(() => {
    vi.mocked(dashboardApi.summary).mockResolvedValue(summary());
    vi.mocked(goto).mockClear();
  });

  // feliz
  it('asks for the last thirty days by default', async () => {
    await mountLoadedModel();

    expect(dashboardApi.summary).toHaveBeenCalledWith(30);
  });

  it('asks again when the person changes the period', async () => {
    const model = await mountLoadedModel();

    model.actions.onPeriodChange(7);

    await waitFor(() => expect(dashboardApi.summary).toHaveBeenCalledWith(7));
    expect(model.data.days).toBe(7);
  });

  it('opens the record of a machine from the map', async () => {
    const model = await mountLoadedModel();

    model.actions.onOpenMachine({
      computerId: 42,
      computerName: 'CONTABIL-03',
      computerDisplayName: null,
      department: null,
      healthScore: 63,
      healthStatus: 'critical',
      activeAlerts: 1,
      maintenanceCount: 0,
    });

    expect(goto).toHaveBeenCalledWith('/computers/42');
  });

  // triste
  it('hands the screen the reason the dashboard did not load', async () => {
    vi.mocked(dashboardApi.summary).mockRejectedValue(new ApiError(500, 'O servidor tropeçou.'));

    const model = mountModel();

    await waitFor(() => expect(model.state.error).toBe('O servidor tropeçou.'));
  });

  /* Sistema recém-instalado: sete zeros não ajudam ninguém, e a tela precisa saber que é
     esse o caso para dizer por onde começar. */
  it('recognises a brand new system as empty', async () => {
    vi.mocked(dashboardApi.summary).mockResolvedValue(
      summary({
        park: { total: 0, critical: 0, attention: 0, neverSeen: 0 },
        tickets: {
          open: 0,
          inProgress: 0,
          openedInPeriod: 0,
          resolvedInPeriod: 0,
          averageResolutionHours: null,
        },
        parts: { kinds: 0, items: 0, outOfStock: 0 },
      }),
    );

    const model = await mountLoadedModel();

    expect(model.state.isEmpty).toBe(true);
  });

  /* Parque saudável NÃO é vazio: há máquinas, e os números têm o que dizer. */
  it('does not call a healthy park empty', async () => {
    vi.mocked(dashboardApi.summary).mockResolvedValue(
      summary({
        park: { total: 7, critical: 0, attention: 0, neverSeen: 0 },
        tickets: {
          open: 0,
          inProgress: 0,
          openedInPeriod: 0,
          resolvedInPeriod: 0,
          averageResolutionHours: null,
        },
      }),
    );

    const model = await mountLoadedModel();

    expect(model.state.isEmpty).toBe(false);
  });

  it('does not call the dashboard empty while it is still loading', () => {
    const model = mountModel();

    expect(model.state.isLoading).toBe(true);
    expect(model.state.isEmpty).toBe(false);
  });
});
