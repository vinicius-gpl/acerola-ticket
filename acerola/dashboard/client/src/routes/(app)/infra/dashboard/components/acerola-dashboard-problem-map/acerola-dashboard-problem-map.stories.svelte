<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { fn } from 'storybook/test';

  import DashboardProblemMap from './acerola-dashboard-problem-map.svelte';

  const byProblemType = [
    { key: 'printer', count: 9 },
    { key: 'network', count: 6 },
    { key: 'slow_computer', count: 4 },
    { key: 'email', count: 3 },
    { key: 'other', count: 1 },
  ];

  const byMaintenanceType = [
    { key: 'preventive', count: 7 },
    { key: 'formatting', count: 3 },
    { key: 'hardware', count: 2 },
  ];

  const { Story } = defineMeta({
    title: 'Features/Dashboard/AcerolaDashboardProblemMap',
    component: DashboardProblemMap,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { byProblemType, byMaintenanceType } }} />

<!-- Com clique: a fatia é o caminho para a lista filtrada, não um enfeite. -->
<Story
  name="Clickable"
  args={{
    data: { byProblemType, byMaintenanceType },
    actions: { onSelectProblem: fn() },
  }}
/>

<Story
  name="Loading"
  args={{ data: { byProblemType: [], byMaintenanceType: [] }, state: { isLoading: true } }}
/>

<Story name="Empty" args={{ data: { byProblemType: [], byMaintenanceType: [] } }} />

<!-- Caso limite: um tipo só — a rosca vira um anel inteiro, e é isso mesmo. -->
<Story
  name="SingleType"
  args={{ data: { byProblemType: [{ key: 'printer', count: 12 }], byMaintenanceType } }}
/>

<!-- Caso limite: uma chave que o catálogo não conhece continua aparecendo, crua. -->
<Story
  name="UnknownKey"
  args={{
    data: {
      byProblemType: [...byProblemType, { key: 'tipo-que-ninguem-cadastrou', count: 2 }],
      byMaintenanceType,
    },
  }}
/>

<!-- Caso limite: na largura de um celular, anel e legenda empilham. -->
<Story name="OnPhone">
  <div class="w-[360px]">
    <DashboardProblemMap data={{ byProblemType, byMaintenanceType }} />
  </div>
</Story>
