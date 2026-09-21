<script lang="ts">
	import AcerolaButton, { type AcerolaButtonProps } from './acerola-button.svelte';

	let { events, ui }: AcerolaButtonProps = $props();
</script>

<AcerolaButton {events} {ui}>
	{#snippet children()}
		Abrir Dashboard
	{/snippet}
</AcerolaButton>
