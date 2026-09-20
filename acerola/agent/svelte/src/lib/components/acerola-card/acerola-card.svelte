<script module lang="ts">
	import type { Snippet } from 'svelte';

	export type AcerolaCardProps = {
		data?: {
			title?: string;
		};
		ui?: {
			size?: 'default' | 'sm';
			class?: string;
		};
	};

	export type AcerolaCardSnippets = {
		children?: Snippet;
	};
</script>

<script lang="ts">
	import * as Card from '$lib/components/ui/card';

	let { data, ui, children }: AcerolaCardProps & AcerolaCardSnippets = $props();
</script>

<Card.Root size={ui?.size ?? 'default'} class={ui?.class}>
	{#if data?.title}
		<Card.Header>
			<Card.Title class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
				{data.title}
			</Card.Title>
		</Card.Header>
	{/if}

	{#if children}
		<Card.Content>
			{@render children()}
		</Card.Content>
	{/if}
</Card.Root>
