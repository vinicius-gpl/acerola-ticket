<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaSegmentedBar from './acerola-segmented-bar.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaSegmentedBar',
		component: AcerolaSegmentedBar
	});
</script>

<Story name="Default" args={{ data: { percent: 62 } }} />

<Story name="High Usage" args={{ data: { percent: 93 }, ui: { colorVar: '--chart-4' } }} />

<Story
	name="Custom Color And Segment Count"
	args={{ data: { percent: 40 }, ui: { colorVar: '--chart-3', segments: 16 } }}
/>

<Story name="Empty (edge case)" args={{ data: { percent: 0 } }} />

<Story name="Full (edge case)" args={{ data: { percent: 100 } }} />

<Story name="Above 100 Clamped (edge case)" args={{ data: { percent: 137 } }} />
