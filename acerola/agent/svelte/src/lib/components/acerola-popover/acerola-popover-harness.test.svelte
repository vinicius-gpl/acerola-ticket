<script lang="ts">
	import AcerolaPopover from './acerola-popover.svelte';

	let {
		title = 'Detalhes',
		description = 'Mais informações'
	}: { title?: string; description?: string } = $props();
</script>

<AcerolaPopover data={{ title, description }}>
	<span>Abrir painel</span>
</AcerolaPopover>
