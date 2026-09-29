<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import AreaChart from './area-chart.svelte';

  const series = [
    { key: 'opened', label: 'Abertos', color: 'var(--chart-1)' },
    { key: 'resolved', label: 'Resolvidos', color: 'var(--chart-4)' },
  ];

  /** Catorze dias de chamados, com um fim de semana parado no meio. */
  const points = [4, 6, 3, 8, 5, 0, 1, 7, 9, 4, 6, 2, 0, 3].map((opened, index) => ({
    at: new Date(2026, 8, 10 + index).toISOString(),
    values: { opened, resolved: Math.max(0, opened - (index % 3)) },
  }));

  const percentSeries = [
    { key: 'cpuPercent', label: 'Processador', color: 'var(--chart-1)' },
    { key: 'memoryPercent', label: 'Memória', color: 'var(--chart-4)' },
  ];

  const percentPoints = [12, 30, 74, 96, 88, 41, 22, 18].map((cpuPercent, index) => ({
    at: new Date(2026, 8, 23, 8 + index).toISOString(),
    values: { cpuPercent, memoryPercent: 55 + (index % 4) * 8 },
  }));

  const { Story } = defineMeta({
    title: 'Components/AreaChart',
    component: AreaChart,
    parameters: { layout: 'padded' },
  });
</script>

<Story name="Default" args={{ data: { points, series } }} />

<!-- Empilhado: as séries são PARTES de um todo, e a altura total é a soma. -->
<Story name="Stacked" args={{ data: { points, series }, ui: { layout: 'stack' } }} />

<!-- Porcentagem: escala travada em 0–100 e régua por hora. -->
<Story
  name="Percent"
  args={{
    data: { points: percentPoints, series: percentSeries },
    ui: { isPercent: true, tick: 'hour' },
  }}
/>

<Story name="Loading" args={{ data: { points: [], series }, state: { isLoading: true } }} />

<Story
  name="Empty"
  args={{ data: { points: [], series }, ui: { emptyLabel: 'Nenhum chamado no período.' } }}
/>

<!-- Caso limite: uma leitura só — a área vira um risco, e é isso mesmo que aconteceu. -->
<Story
  name="SinglePoint"
  args={{ data: { points: [points[0]!], series } }}
/>

<!-- Caso limite: seis séries, o máximo que a legenda comporta sem virar parede. -->
<Story
  name="ManySeries"
  args={{
    data: {
      points,
      series: [
        ...series,
        { key: 'reopened', label: 'Reabertos', color: 'var(--chart-5)' },
        { key: 'late', label: 'Atrasados', color: 'var(--chart-3)' },
      ],
    },
  }}
/>
