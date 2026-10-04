<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { BarChart } from 'layerchart';

  import ChartFrame from './acerola-chart-frame.svelte';

  const data = [
    { label: 'Segunda', value: 8 },
    { label: 'Terça', value: 12 },
    { label: 'Quarta', value: 5 },
  ];

  const { Story } = defineMeta({
    title: 'Components/AcerolaChartFrame',
    component: ChartFrame,
    parameters: { layout: 'padded' },
  });
</script>

<!-- A moldura sozinha não desenha nada: o que ela faz só se vê em volta de um gráfico. -->
<Story name="Default">
  <div class="h-64 w-full max-w-lg">
    <ChartFrame data={{ config: { value: { label: 'Chamados', color: 'var(--chart-1)' } } }}>
      <BarChart
        {data}
        x="label"
        y="value"
        series={[{ key: 'value', label: 'Chamados', value: 'value', color: 'var(--color-value)' }]}
        grid={false}
        rule={false}
      />
    </ChartFrame>
  </div>
</Story>

<!-- Sem cor no contrato, a série cai na cor padrão da biblioteca. -->
<Story name="WithoutColour">
  <div class="h-64 w-full max-w-lg">
    <ChartFrame data={{ config: { value: { label: 'Chamados' } } }}>
      <BarChart {data} x="label" y="value" grid={false} rule={false} />
    </ChartFrame>
  </div>
</Story>

<!-- Caso limite: dois gráficos lado a lado, cada um com a própria paleta. -->
<Story name="TwoCharts">
  <div class="flex gap-4">
    <div class="h-48 flex-1">
      <ChartFrame data={{ config: { value: { label: 'Chamados', color: 'var(--chart-1)' } } }}>
        <BarChart
          {data}
          x="label"
          y="value"
          series={[
            { key: 'value', label: 'Chamados', value: 'value', color: 'var(--color-value)' },
          ]}
          grid={false}
          rule={false}
        />
      </ChartFrame>
    </div>
    <div class="h-48 flex-1">
      <ChartFrame data={{ config: { value: { label: 'Manutenções', color: 'var(--chart-5)' } } }}>
        <BarChart
          {data}
          x="label"
          y="value"
          series={[
            { key: 'value', label: 'Manutenções', value: 'value', color: 'var(--color-value)' },
          ]}
          grid={false}
          rule={false}
        />
      </ChartFrame>
    </div>
  </div>
</Story>
