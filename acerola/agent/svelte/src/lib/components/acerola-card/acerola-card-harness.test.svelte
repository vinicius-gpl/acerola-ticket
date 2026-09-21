<script lang="ts">
	import AcerolaCard, { type AcerolaCardProps } from './acerola-card.svelte';

	let { data, ui }: AcerolaCardProps = $props();
</script>

<AcerolaCard {data} {ui}>
	{#snippet children()}
		<p>42%</p>
	{/snippet}
</AcerolaCard>
