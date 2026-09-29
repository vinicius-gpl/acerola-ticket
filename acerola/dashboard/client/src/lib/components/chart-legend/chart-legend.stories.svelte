<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import ChartLegend from './chart-legend.svelte';

  const { Story } = defineMeta({
    title: 'Components/ChartLegend',
    component: ChartLegend,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{
    data: {
      series: [
        { key: 'opened', label: 'Abertos', color: 'var(--chart-1)' },
        { key: 'resolved', label: 'Resolvidos', color: 'var(--chart-4)' },
      ],
    },
  }}
/>

<!-- Caso limite: uma série só. A legenda continua, porque a cor sozinha nunca explica. -->
<Story
  name="SingleSeries"
  args={{ data: { series: [{ key: 'opened', label: 'Abertos', color: 'var(--chart-1)' }] } }}
/>

<!-- Caso limite: nomes compridos, que precisam quebrar em vez de estourar a linha. -->
<Story
  name="LongNames"
  args={{
    data: {
      series: [
        { key: 'cpu', label: 'Processador em uso, média do período', color: 'var(--chart-1)' },
        { key: 'memory', label: 'Memória ocupada, média do período', color: 'var(--chart-4)' },
        { key: 'disk', label: 'Disco ocupado, média do período', color: 'var(--chart-5)' },
      ],
    },
  }}
/>

<Story name="Empty" args={{ data: { series: [] } }} />
