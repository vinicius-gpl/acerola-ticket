<script lang="ts">
	import AcerolaBadge, { type AcerolaBadgeProps } from './acerola-badge.svelte';

	let { ui, text = 'rótulo' }: AcerolaBadgeProps & { text?: string } = $props();
</script>

<AcerolaBadge {ui}>
	{#snippet children()}
		{text}
	{/snippet}
</AcerolaBadge>
