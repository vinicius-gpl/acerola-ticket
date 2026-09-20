<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaTrendBadge from './acerola-trend-badge.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaTrendBadge',
		component: AcerolaTrendBadge
	});

	const format = (delta: number) => `${delta.toFixed(0)}pp`;
</script>

<Story name="Subindo" args={{ data: { trend: { direction: 'up', delta: 4.2 }, format } }} />

<Story name="Descendo" args={{ data: { trend: { direction: 'down', delta: 2.1 }, format } }} />

<Story
	name="Estável (caso limite)"
	args={{ data: { trend: { direction: 'flat', delta: 0 }, format } }}
/>
