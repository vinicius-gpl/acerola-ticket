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

<Story name="Without Title">
	{#snippet children()}
		<p class="text-sm">Card sem cabeçalho, apenas com corpo de conteúdo.</p>
	{/snippet}
</Story>

<Story name="Small Size" args={{ data: { title: 'Compacto' }, ui: { size: 'sm' } }}>
	{#snippet children()}
		<p class="text-sm">Espaçamento interno reduzido para visualizações densas.</p>
	{/snippet}
</Story>

<Story
	name="Custom Styling"
	args={{ data: { title: 'Destaque' }, ui: { class: 'border-primary/40' } }}
>
	{#snippet children()}
		<p class="text-sm">Borda customizada através da prop ui.</p>
	{/snippet}
</Story>

<Story name="Empty Content (edge case)" args={{ data: { title: 'Vazio' } }} />

<Story
	name="Long Title and Content (edge case)"
	args={{ data: { title: 'Título extremamente longo para validação de layout do card' } }}
>
	{#snippet children()}
		<p class="text-muted-foreground text-xs">
			Texto de corpo extenso para assegurar que nenhum elemento quebre os limites do contêiner.
		</p>
	{/snippet}
</Story>
