<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import DashboardPeaking from './acerola-dashboard-peaking.svelte';

  const machines = [
    { computerId: 1, computerName: 'CONTABIL-03', today: 6, month: 41, topMetric: 'memory' },
    { computerId: 2, computerName: 'FISCAL-01', today: 3, month: 22, topMetric: 'cpu' },
    { computerId: 3, computerName: 'RECEPCAO-02', today: 1, month: 9, topMetric: 'disk' },
  ] as const;

  const { Story } = defineMeta({
    title: 'Features/Dashboard/AcerolaDashboardPeaking',
    component: DashboardPeaking,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { machines } }} />

<Story name="Loading" args={{ data: { machines: [] }, state: { isLoading: true } }} />

<Story name="Empty" args={{ data: { machines: [] } }} />

<!-- Caso limite: ninguém bateu no teto HOJE, mas houve pico no mês — cada recorte tem o
     próprio vazio, e trocar de aba mostra a diferença. -->
<Story
  name="QuietToday"
  args={{
    data: {
      machines: [
        { computerId: 1, computerName: 'CONTABIL-03', today: 0, month: 18, topMetric: 'memory' },
      ],
    },
  }}
/>

<!-- Caso limite: agente antigo, que não diz qual medida estourou. -->
<Story
  name="WithoutTopMetric"
  args={{
    data: {
      machines: [
        { computerId: 4, computerName: 'ANTIGA-04', today: 4, month: 12, topMetric: null },
      ],
    },
  }}
/>

<!-- Caso limite: na largura de um celular. -->
<Story name="OnPhone">
  <div class="w-[360px]">
    <DashboardPeaking data={{ machines }} />
  </div>
</Story>
