<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaTrendBadge from './acerola-trend-badge.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaTrendBadge',
		component: AcerolaTrendBadge
	});

	const format = (delta: number) => `${delta.toFixed(0)}pp`;
</script>

<Story name="Up Trend" args={{ data: { trend: { direction: 'up', delta: 4.2 }, format } }} />

<Story name="Down Trend" args={{ data: { trend: { direction: 'down', delta: 2.1 }, format } }} />

<Story
	name="Flat Trend (edge case)"
	args={{ data: { trend: { direction: 'flat', delta: 0 }, format } }}
/>

<Story
	name="Large Delta (edge case)"
	args={{ data: { trend: { direction: 'up', delta: 99.8 }, format } }}
/>

<Story
	name="Custom Styling"
	args={{
		data: { trend: { direction: 'down', delta: 15 }, format },
		ui: { class: 'text-sm font-bold px-2 py-0.5' }
	}}
/>
