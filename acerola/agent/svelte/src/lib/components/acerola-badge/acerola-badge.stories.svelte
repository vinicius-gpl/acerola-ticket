<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaBadge from './acerola-badge.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaBadge',
		component: AcerolaBadge
	});
</script>

<Story name="Default">
	{#snippet children()}
		padrão
	{/snippet}
</Story>

<Story name="Online" args={{ ui: { tone: 'online' } }}>
	{#snippet children()}
		ao vivo
	{/snippet}
</Story>

<Story name="Offline" args={{ ui: { tone: 'offline' } }}>
	{#snippet children()}
		conectando
	{/snippet}
</Story>

<Story name="Texto vazio (caso limite)" args={{ ui: { tone: 'online' } }}>
	{#snippet children()}
		{''}
	{/snippet}
</Story>
