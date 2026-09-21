<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';

  import DonutChart from './donut-chart.svelte';

  const slices = [
    { label: 'Em andamento', value: 10 },
    { label: 'Concluído', value: 9 },
    { label: 'Aguardando pagamento', value: 6 },
    { label: 'Em vigor (vencimento)', value: 4 },
    { label: 'Sem obrigatoriedade', value: 2 },
    { label: 'Não iniciado', value: 1 },
  ];

  const { Story } = defineMeta({
    title: 'Components/DonutChart',
    component: DonutChart,
    parameters: { layout: 'padded' },
  });
</script>

<!-- Mesma razão do ColumnChart: o anel precisa de uma caixa com altura para existir. -->
{#snippet inBox(args: ComponentProps<typeof DonutChart>)}
  <div class="h-72 w-full max-w-xl">
    <DonutChart {...args} />
  </div>
{/snippet}

<Story name="Default" args={{ data: { slices, seriesLabel: 'Status' } }} template={inBox} />

<!-- Só duas fatias: o total no meio do anel precisa continuar legível. -->
<Story
  name="FewSlices"
  args={{
    data: {
      slices: [
        { label: 'Ativas', value: 7 },
        { label: 'Inativas', value: 1 },
      ],
      seriesLabel: 'Clientes',
    },
  }}
  template={inBox}
/>

<Story
  name="Loading"
  args={{ data: { slices, seriesLabel: 'Status' }, state: { isLoading: true } }}
  template={inBox}
/>

<Story name="Empty" args={{ data: { slices: [], seriesLabel: 'Status' } }} template={inBox} />

<Story
  name="CustomEmptyLabel"
  args={{
    data: { slices: [], seriesLabel: 'Cidade' },
    ui: { emptyLabel: 'Nenhum cliente neste filtro' },
  }}
  template={inBox}
/>
