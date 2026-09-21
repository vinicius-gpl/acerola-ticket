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
	name="Single Series"
	args={{
		data: { timestamps, series: [wave(0)] },
		ui: { colorVars: ['--chart-5'], fixedMax: 100 }
	}}
/>

<Story
	name="Multi Series"
	args={{
		data: { timestamps, series: [wave(0), wave(20)] },
		ui: { colorVars: ['--chart-5', '--chart-2'] }
	}}
/>

<Story
	name="Fixed Max Scale"
	args={{
		data: { timestamps, series: [wave(0)] },
		ui: { colorVars: ['--chart-3'], fixedMax: 150 }
	}}
/>

<Story
	name="Custom Height"
	args={{
		data: { timestamps, series: [wave(0)] },
		ui: { colorVars: ['--chart-4'], height: 120 }
	}}
/>

<Story
	name="Empty Data (edge case)"
	args={{
		data: { timestamps: [], series: [[]] },
		ui: { colorVars: ['--chart-5'], fixedMax: 100 }
	}}
/>
