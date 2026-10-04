<script module lang="ts">
	import type { Snippet } from 'svelte';

	export type AcerolaCardProps = {
		data?: {
			title?: string;
			description?: string;
		};
		ui?: {
			size?: 'default' | 'sm';
			class?: string;
		};
	};

	export type AcerolaCardSnippets = {
		children?: Snippet;
		headerAction?: Snippet;
	};
</script>

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils/cn';

	let { data, ui, children, headerAction }: AcerolaCardProps & AcerolaCardSnippets = $props();
</script>

<!-- ReUI Card style: bordas nítidas, cantos arredondados generosos, tipografia técnica elegante -->
<Card.Root
	size={ui?.size ?? 'default'}
	class={cn(
		'border-border/80 bg-card text-card-foreground hover:border-border rounded-surface flex flex-col border shadow-xs transition-all',
		ui?.class
	)}
>
	{#if data?.title}
		<Card.Header class="flex shrink-0 flex-row items-center justify-between pb-1">
			<div>
				<Card.Title class="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
					{data.title}
				</Card.Title>
				{#if data.description}
					<p class="text-muted-foreground mt-0.5 text-xs">{data.description}</p>
				{/if}
			</div>
			{#if headerAction}
				<div>
					{@render headerAction()}
				</div>
			{/if}
		</Card.Header>
	{/if}

	{#if children}
		<Card.Content class="flex min-h-0 flex-1 flex-col">
			{@render children()}
		</Card.Content>
	{/if}
</Card.Root>
