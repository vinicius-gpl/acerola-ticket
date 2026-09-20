<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaCard from './acerola-card.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaCard',
		component: AcerolaCard
	});
</script>

<Story name="Default" args={{ data: { title: 'CPU' } }}>
	{#snippet children()}
		<p class="text-xl font-semibold">42%</p>
	{/snippet}
</Story>

<Story name="Sem título">
	{#snippet children()}
		<p class="text-sm">Card sem cabeçalho, só conteúdo.</p>
	{/snippet}
</Story>

<Story name="Tamanho pequeno" args={{ data: { title: 'Compacto' }, ui: { size: 'sm' } }}>
	{#snippet children()}
		<p class="text-sm">Menos espaçamento interno.</p>
	{/snippet}
</Story>

<Story name="Sem conteúdo (caso limite)" args={{ data: { title: 'Vazio' } }} />
