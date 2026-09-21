<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaMetricTile from './acerola-metric-tile.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaMetricTile',
		component: AcerolaMetricTile
	});

	const timestamps = Array.from({ length: 30 }, (_, i) => i);
	const series = timestamps.map((t) => 50 + 30 * Math.sin(t / 4));
	const series2 = timestamps.map((t) => 30 + 20 * Math.cos(t / 4));
</script>

<Story
	name="Default With Sparkline and Trend"
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
	name="Value Only Without Sparkline"
	args={{ data: { label: 'Disco (leitura)', value: '1.2 MB/s' } }}
/>

<Story
	name="Segmented Bar Instead Of Sparkline"
	args={{
		data: {
			label: 'Memória',
			value: '93% (14.8 GB / 15.8 GB)',
			trend: { direction: 'flat', delta: 0 },
			trendFormat: (delta: number) => `${delta.toFixed(0)}pp`,
			bar: { percent: 93 }
		},
		ui: { colorVars: ['--chart-4'] }
	}}
/>

<Story
	name="Multiple Series Sparkline"
	args={{
		data: {
			label: 'Rede',
			value: '↓ 1.2 MB/s · ↑ 450 KB/s',
			sparkline: { timestamps, series: [series, series2] }
		},
		ui: { colorVars: ['--chart-5', '--chart-2'] }
	}}
/>

<Story name="Connecting Or Empty (edge case)" args={{ data: { label: 'Rede', value: '—' } }} />

<Story
	name="Long Values (edge case)"
	args={{
		data: {
			label: 'Memória Física Agregada',
			value: '82% (13.1 GB / 15.8 GB)',
			trend: { direction: 'down', delta: 1 },
			trendFormat: (delta: number) => `${delta.toFixed(0)}pp`
		}
	}}
/>
