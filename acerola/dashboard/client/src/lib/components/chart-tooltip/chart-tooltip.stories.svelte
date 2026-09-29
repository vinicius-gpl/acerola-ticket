<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';
  import { AreaChart, BarChart, PieChart } from 'layerchart';

  import ChartFrame from '$lib/components/chart-frame/chart-frame.svelte';
  import { dayLabel } from '$lib/utils/time-series';

  import ChartTooltip from './chart-tooltip.svelte';

  const bars = [
    { label: 'Impressora', value: 12 },
    { label: 'Internet / Rede', value: 9 },
    { label: 'Computador lento', value: 5 },
  ];

  const points = [4, 6, 3, 8, 5, 2, 7].map((opened, index) => ({
    at: new Date(2026, 8, 17 + index),
    opened,
    resolved: Math.max(0, opened - 2),
  }));

  const { Story } = defineMeta({
    title: 'Components/ChartTooltip',
    component: ChartTooltip,
    parameters: { layout: 'padded' },
  });
</script>

<!-- O balão só aparece com o ponteiro EM CIMA do desenho: passe o mouse pelas barras. -->
<Story name="Default">
  <div class="h-64 w-full max-w-lg">
    <ChartFrame data={{ config: { value: { label: 'Chamados', color: 'var(--chart-1)' } } }}>
      <BarChart
        data={bars}
        x="label"
        y="value"
        series={[{ key: 'value', label: 'Chamados', value: 'value', color: 'var(--color-value)' }]}
        grid={false}
        rule={false}
      >
        {#snippet tooltip()}
          <ChartTooltip />
        {/snippet}
      </BarChart>
    </ChartFrame>
  </div>
</Story>

<!-- Várias séries no mesmo ponto, e a linha de cima escrita como data. -->
<Story name="ManySeries">
  <div class="h-64 w-full max-w-lg">
    <ChartFrame
      data={{
        config: {
          opened: { label: 'Abertos', color: 'var(--chart-1)' },
          resolved: { label: 'Resolvidos', color: 'var(--chart-4)' },
        },
      }}
    >
      <AreaChart
        data={points}
        x="at"
        y={['opened', 'resolved']}
        seriesLayout="overlap"
        series={[
          { key: 'opened', label: 'Abertos', value: 'opened', color: 'var(--color-opened)' },
          {
            key: 'resolved',
            label: 'Resolvidos',
            value: 'resolved',
            color: 'var(--color-resolved)',
          },
        ]}
        rule={false}
      >
        {#snippet tooltip()}
          <ChartTooltip actions={{ onFormatLabel: (value) => dayLabel(value as Date) }} />
        {/snippet}
      </AreaChart>
    </ChartFrame>
  </div>
</Story>

<!-- Caso limite: na rosca a linha de cima repetiria a fatia, então ela sai. -->
<Story name="WithoutHeading">
  <div class="h-64 w-64">
    <ChartFrame data={{ config: { Impressora: { label: 'Impressora' } } }}>
      <PieChart data={bars} key="label" value="value" innerRadius={-28}>
        {#snippet tooltip()}
          <ChartTooltip ui={{ isLabelHidden: true }} />
        {/snippet}
      </PieChart>
    </ChartFrame>
  </div>
</Story>
