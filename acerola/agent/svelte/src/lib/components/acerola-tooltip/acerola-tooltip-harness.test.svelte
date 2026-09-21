<script lang="ts">
	import AcerolaTooltip, { type AcerolaTooltipProps } from './acerola-tooltip.svelte';

	let {
		text = 'Dica rápida',
		ui,
		hasContent = false,
		triggerText = 'Passe o mouse'
	}: {
		text?: string;
		ui?: AcerolaTooltipProps['ui'];
		hasContent?: boolean;
		triggerText?: string;
	} = $props();
</script>

<AcerolaTooltip data={{ text }} {ui}>
	<span>{triggerText}</span>
	{#snippet content()}
		{#if hasContent}
			<span data-testid="tooltip-custom-content">Conteúdo Rico</span>
		{/if}
	{/snippet}
</AcerolaTooltip>
