<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Insights } from '@template/shared/schemas/insight.schema';

  import InsightsView from './insights-view.svelte';

  function insights(over: Partial<Insights> = {}): Insights {
    return {
      days: 30,
      overloaded: [
        {
          computerId: 2,
          computerName: 'FINANCEIRO-02',
          computerDisplayName: 'Financeiro — mesa 2',
          department: 'financeiro',
          averageCpuPercent: 41,
          averageMemoryPercent: 89,
          sampleCount: 288,
          activeAlerts: 1,
        },
      ],
      upgrades: [
        {
          computerId: 2,
          computerName: 'FINANCEIRO-02',
          computerDisplayName: 'Financeiro — mesa 2',
          department: 'financeiro',
          reason: 'memory',
          value: 4,
          healthScore: 88,
          healthStatus: 'attention',
        },
      ],
      troublesome: [
        {
          computerId: 2,
          computerName: 'FINANCEIRO-02',
          computerDisplayName: 'Financeiro — mesa 2',
          department: 'financeiro',
          maintenanceCount: 3,
          alertCount: 2,
          lastMaintenanceAt: '2026-06-20T12:00:00.000Z',
        },
      ],
      spares: [
        {
          computerId: 5,
          computerName: 'COMERCIAL-05',
          computerDisplayName: 'Comercial — notebook de visita',
          department: null,
          healthScore: 100,
          healthStatus: 'good',
          memoryGb: 16,
          diskGb: 512,
          cpuModel: 'Intel Core i7-1165G7',
          lastSeenAt: '2026-09-16T12:00:00.000Z',
        },
      ],
      ...over,
    };
  }
  const actions = {
    onPeriodChange: () => {},
    onRetry: () => {},
    onOpenMachine: () => {},
    onOpenComputers: () => {},
  };

  const settled = { isLoading: false, isEmpty: false, error: null };

  const { Story } = defineMeta({
    title: 'Components/InsightsView',
    component: InsightsView,
  });
</script>

<Story
  name="Default"
  args={{ data: { insights: insights(), days: 30 }, state: settled, actions }}
/>

<!-- Nada a recomendar: a boa notícia é dita, e as quatro listas explicam a régua mesmo assim. -->
<Story
  name="Nothing to recommend"
  args={{
    data: {
      insights: insights({ overloaded: [], upgrades: [], troublesome: [], spares: [] }),
      days: 30,
    },
    state: settled,
    actions,
  }}
/>

<Story
  name="Loading"
  args={{ data: { insights: null, days: 30 }, state: { ...settled, isLoading: true }, actions }}
/>

<!-- Parque vazio: o texto diz por onde começar. -->
<Story
  name="No machines yet"
  args={{
    data: {
      insights: insights({ overloaded: [], upgrades: [], troublesome: [], spares: [] }),
      days: 30,
    },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<Story
  name="Error"
  args={{
    data: { insights: null, days: 30 },
    state: { ...settled, error: 'Não consegui falar com o servidor. Confira se ele está rodando.' },
    actions,
  }}
/>
