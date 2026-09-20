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

<Story name="Ghost Icon" args={{ ui: { variant: 'ghost', size: 'icon', title: 'Fechar' } }}>
	{#snippet children()}
		✕
	{/snippet}
</Story>

<Story name="Outline" args={{ ui: { variant: 'outline' } }}>
	{#snippet children()}
		Opções
	{/snippet}
</Story>

<Story name="Secondary" args={{ ui: { variant: 'secondary' } }}>
	{#snippet children()}
		Secundário
	{/snippet}
</Story>

<Story name="Destructive" args={{ ui: { variant: 'destructive' } }}>
	{#snippet children()}
		Remover
	{/snippet}
</Story>

<Story name="Small Size" args={{ ui: { size: 'sm' } }}>
	{#snippet children()}
		Compacto
	{/snippet}
</Story>

<Story name="Disabled State" args={{ ui: { disabled: true } }}>
	{#snippet children()}
		Indisponível
	{/snippet}
</Story>

<Story name="Long Text (edge case)" args={{ ui: { class: 'max-w-48' } }}>
	{#snippet children()}
		Rótulo excessivamente longo para validar quebra no botão
	{/snippet}
</Story>
