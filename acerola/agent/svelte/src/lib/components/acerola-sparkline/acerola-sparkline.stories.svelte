<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaSparkline from './acerola-sparkline.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaSparkline',
		component: AcerolaSparkline
	});

	const timestamps = Array.from({ length: 30 }, (_, i) => i);
	const wave = (offset: number) =>
		timestamps.map((t) => 50 + offset + 30 * Math.sin((t + offset) / 4));
</script>

<Story
	name="Uma série"
	args={{
		data: { timestamps, series: [wave(0)] },
		ui: { colorVars: ['--chart-5'], fixedMax: 100 }
	}}
/>

<Story
	name="Duas séries"
	args={{
		data: { timestamps, series: [wave(0), wave(20)] },
		ui: { colorVars: ['--chart-5', '--chart-2'] }
	}}
/>

<Story
	name="Sem dados ainda (caso limite)"
	args={{
		data: { timestamps: [], series: [[]] },
		ui: { colorVars: ['--chart-5'], fixedMax: 100 }
	}}
/>
