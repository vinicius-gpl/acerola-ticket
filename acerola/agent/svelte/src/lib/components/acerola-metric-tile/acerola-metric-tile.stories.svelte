<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaMetricTile from './acerola-metric-tile.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaMetricTile',
		component: AcerolaMetricTile
	});

	const timestamps = Array.from({ length: 30 }, (_, i) => i);
	const series = timestamps.map((t) => 50 + 30 * Math.sin(t / 4));
</script>

<Story
	name="Com sparkline e tendência"
	args={{
		data: {
			label: 'CPU',
			value: '42%',
			trend: { direction: 'up', delta: 3 },
			trendFormat: (delta: number) => `${delta.toFixed(0)}pp`,
			sparkline: { timestamps, series: [series] }
		},
		ui: { colorVars: ['--chart-5'], fixedMax: 100 }
	}}
/>

<Story
	name="Só valor, sem gráfico"
	args={{ data: { label: 'Disco (leitura)', value: '1.2 MB/s' } }}
/>

<Story name="Sem métricas ainda (caso limite)" args={{ data: { label: 'Rede', value: '—' } }} />
