<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import type { ComponentProps } from 'svelte';
  import { fn } from 'storybook/test';

  import ColumnChart from './column-chart.svelte';

  const slices = [
    { label: 'Ana', value: 12 },
    { label: 'Bia', value: 9 },
    { label: 'Caio', value: 6 },
    { label: 'Duda', value: 3 },
  ];

  const { Story } = defineMeta({
    title: 'Components/ColumnChart',
    component: ColumnChart,
    parameters: { layout: 'padded' },
  });
</script>

<!-- O gráfico preenche o espaço que recebe; sem uma caixa de altura definida ele nasceria
     com zero de altura no Storybook. -->
{#snippet inBox(args: ComponentProps<typeof ColumnChart>)}
  <div class="h-72 w-full max-w-xl">
    <ColumnChart {...args} />
  </div>
{/snippet}

<Story name="Default" args={{ data: { slices, seriesLabel: 'Tarefas' } }} template={inBox} />

<!-- Com clique: a coluna vira o caminho para a lista filtrada. -->
<Story
  name="Clickable"
  args={{ data: { slices, seriesLabel: 'Tarefas' }, actions: { onSelect: fn() } }}
  template={inBox}
/>

<Story
  name="Loading"
  args={{ data: { slices, seriesLabel: 'Tarefas' }, state: { isLoading: true } }}
  template={inBox}
/>

<Story
  name="Empty"
  args={{
    data: { slices: [], seriesLabel: 'Tarefas' },
    ui: { emptyLabel: 'Nenhuma tarefa ainda' },
  }}
  template={inBox}
/>

<!-- Caso limite: rótulos longos no eixo são cortados; o nome inteiro fica no tooltip. -->
<Story
  name="LongLabels"
  args={{
    data: {
      slices: [
        { label: 'Responsável com nome muito comprido', value: 8 },
        { label: 'Outro nome igualmente comprido', value: 5 },
        { label: 'Curto', value: 2 },
      ],
      seriesLabel: 'Tarefas',
    },
  }}
  template={inBox}
/>

<!-- Caso limite: uma coluna só. -->
<Story
  name="SingleColumn"
  args={{ data: { slices: [{ label: 'Ana', value: 1 }], seriesLabel: 'Tarefas' } }}
  template={inBox}
/>
