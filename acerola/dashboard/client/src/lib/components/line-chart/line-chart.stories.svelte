<script module lang="ts">
  import { defineMeta } from '@storybook/addon-svelte-csf';

  import LineChart from './line-chart.svelte';

  const series = [
    { key: 'cpuPercent', label: 'Processador', color: 'var(--chart-1)' },
    { key: 'memoryPercent', label: 'Memória', color: 'var(--chart-4)' },
  ];

  const points = [12, 30, 74, 96, 88, 41, 22, 18].map((cpuPercent, index) => ({
    at: new Date(2026, 8, 23, 8 + index).toISOString(),
    values: { cpuPercent, memoryPercent: 55 + (index % 4) * 8 },
  }));

  const monthSeries = [
    { key: 'tickets', label: 'Chamados', color: 'var(--chart-1)' },
    { key: 'maintenances', label: 'Manutenções', color: 'var(--chart-5)' },
  ];

  const monthPoints = Array.from({ length: 30 }, (_value, index) => ({
    at: new Date(2026, 8, 1 + index).toISOString(),
    values: { tickets: 3 + (index % 7), maintenances: 1 + (index % 3) },
  }));

  const { Story } = defineMeta({
    title: 'Components/LineChart',
    component: LineChart,
    parameters: { layout: 'padded' },
  });
</script>

<Story
  name="Default"
  args={{ data: { points, series }, ui: { tick: 'hour', isPercent: true } }}
/>

<!-- Trinta dias: o ponto em cada leitura sai, porque viraria um colar de contas. -->
<Story name="LongRange" args={{ data: { points: monthPoints, series: monthSeries } }} />

<Story name="Loading" args={{ data: { points: [], series }, state: { isLoading: true } }} />

<Story
  name="Empty"
  args={{ data: { points: [], series }, ui: { emptyLabel: 'Sem leituras nas últimas horas.' } }}
/>

<!-- Caso limite: duas leituras só — a linha existe, mas não conta história nenhuma. -->
<Story name="TwoPoints" args={{ data: { points: points.slice(0, 2), series } }} />

<!-- Caso limite: uma série só, sem nada para comparar. -->
<Story name="SingleSeries" args={{ data: { points, series: [series[0]!] } }} />
