<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { type Dashboard, type ProblemMachine } from '@template/shared/schemas/dashboard.schema';

  import DashboardView from './dashboard-view.svelte';

  function machine(over: Partial<ProblemMachine> = {}): ProblemMachine {
    return {
      computerId: 3,
      computerName: 'CONTABIL-03',
      computerDisplayName: 'Contábil — mesa do fechamento',
      department: 'contabil',
      healthScore: 63,
      healthStatus: 'critical',
      activeAlerts: 1,
      maintenanceCount: 1,
      ...over,
    };
  }

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
      worstMachines: [
        machine(),
        machine({
          computerId: 2,
          computerName: 'FINANCEIRO-02',
          computerDisplayName: 'Financeiro — mesa 2',
          department: 'financeiro',
          healthScore: 88,
          healthStatus: 'attention',
          activeAlerts: 0,
          maintenanceCount: 3,
        }),
        machine({
          computerId: 8,
          computerName: 'PARALEGAL-08-ESTACAO-COMPARTILHADA',
          computerDisplayName:
            'Paralegal — estação compartilhada do corredor (usada por mais de uma pessoa)',
          department: 'paralegal',
          healthScore: 100,
          healthStatus: 'attention',
          activeAlerts: 0,
          maintenanceCount: 1,
        }),
      ],
      byProblemType: [
        { key: 'printer', count: 4 },
        { key: 'network', count: 3 },
        { key: 'slow_computer', count: 2 },
      ],
      byDepartment: [
        { key: 'financeiro', count: 4 },
        { key: 'rh', count: 3 },
        { key: 'comercial', count: 2 },
      ],
      ...over,
    };
  }

  const actions = {
    onPeriodChange: () => {},
    onRetry: () => {},
    onOpenMachine: () => {},
    onOpenComputers: () => {},
    onOpenTickets: () => {},
    onOpenMaintenance: () => {},
    onOpenParts: () => {},
  };

  const settled = { isLoading: false, isEmpty: false, error: null };

  const { Story } = defineMeta({
    title: 'Components/DashboardView',
    component: DashboardView,
  });
</script>

<!-- O dia normal: algumas coisas pegando fogo. -->
<Story name="Default" args={{ data: { summary: summary(), days: 30 }, state: settled, actions }} />

<!-- Parque em ordem: a boa notícia é dita, não é uma lista vazia. -->
<Story
  name="Everything in order"
  args={{
    data: {
      summary: summary({
        park: { total: 7, critical: 0, attention: 0, neverSeen: 0 },
        tickets: {
          open: 0,
          inProgress: 0,
          openedInPeriod: 3,
          resolvedInPeriod: 3,
          averageResolutionHours: 0.4,
        },
        maintenance: { doneInPeriod: 7, preventiveDue: 0 },
        parts: { kinds: 8, items: 23, outOfStock: 0 },
        worstMachines: [],
      }),
      days: 30,
    },
    state: settled,
    actions,
  }}
/>

<Story
  name="Loading"
  args={{ data: { summary: null, days: 30 }, state: { ...settled, isLoading: true }, actions }}
/>

<!-- Sistema recém-instalado: o texto diz por onde começar, em vez de sete zeros. -->
<Story
  name="Brand new system"
  args={{
    data: {
      summary: summary({
        park: { total: 0, critical: 0, attention: 0, neverSeen: 0 },
        tickets: {
          open: 0,
          inProgress: 0,
          openedInPeriod: 0,
          resolvedInPeriod: 0,
          averageResolutionHours: null,
        },
        maintenance: { doneInPeriod: 0, preventiveDue: 0 },
        parts: { kinds: 0, items: 0, outOfStock: 0 },
        worstMachines: [],
        byProblemType: [],
        byDepartment: [],
      }),
      days: 30,
    },
    state: { ...settled, isEmpty: true },
    actions,
  }}
/>

<Story
  name="Error"
  args={{
    data: { summary: null, days: 30 },
    state: { ...settled, error: 'Não consegui falar com o servidor. Confira se ele está rodando.' },
    actions,
  }}
/>

<!-- Recorte de sete dias: o texto do período acompanha a escolha. -->
<Story
  name="Seven days"
  args={{ data: { summary: summary({ days: 7 }), days: 7 }, state: settled, actions }}
/>
