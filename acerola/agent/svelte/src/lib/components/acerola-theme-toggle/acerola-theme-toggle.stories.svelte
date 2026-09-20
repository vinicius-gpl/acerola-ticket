<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaThemeToggle from './acerola-theme-toggle.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaThemeToggle',
		component: AcerolaThemeToggle
	});
</script>

<Story name="Default" />
