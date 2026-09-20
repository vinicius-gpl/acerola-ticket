<script lang="ts">
	import AcerolaPopover, { type AcerolaPopoverProps } from './acerola-popover.svelte';

	let {
		title = 'Detalhes',
		description = 'Mais informações',
		ui,
		hasContent = true,
		triggerText = 'Abrir painel'
	}: {
		title?: string;
		description?: string;
		ui?: AcerolaPopoverProps['ui'];
		hasContent?: boolean;
		triggerText?: string;
	} = $props();
</script>

<AcerolaPopover data={{ title, description }} {ui}>
	<span>{triggerText}</span>
	{#snippet content()}
		{#if hasContent}
			<div data-testid="popover-content">Conteúdo interno</div>
		{/if}
	{/snippet}
</AcerolaPopover>
