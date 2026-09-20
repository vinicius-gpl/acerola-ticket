<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaButton from './acerola-button.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaButton',
		component: AcerolaButton
	});
</script>

<Story name="Default">
	{#snippet children()}
		Abrir Dashboard
	{/snippet}
</Story>

<Story name="Ghost (ícone)" args={{ ui: { variant: 'ghost', size: 'icon' } }}>
	{#snippet children()}
		×
	{/snippet}
</Story>

<Story name="Desabilitado" args={{ ui: { disabled: true } }}>
	{#snippet children()}
		Indisponível
	{/snippet}
</Story>

<Story name="Texto longo (caso limite)" args={{ ui: { class: 'max-w-40' } }}>
	{#snippet children()}
		Um rótulo bem mais longo do que o botão normalmente recebe
	{/snippet}
</Story>
