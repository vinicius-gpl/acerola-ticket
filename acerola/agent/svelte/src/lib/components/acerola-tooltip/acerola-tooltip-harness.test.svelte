<script lang="ts">
	import AcerolaTooltip from './acerola-tooltip.svelte';

	let { text = 'Dica rápida' }: { text?: string } = $props();
</script>

<AcerolaTooltip data={{ text }}>
	<span>Passe o mouse</span>
</AcerolaTooltip>
