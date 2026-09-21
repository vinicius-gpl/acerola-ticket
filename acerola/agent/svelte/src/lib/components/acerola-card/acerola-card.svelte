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
	import { cn } from '$lib/utils/cn';

	let { data, ui, children }: AcerolaCardProps & AcerolaCardSnippets = $props();
</script>

<!-- border-border/ring-0: toda AcerolaCard usa moldura de borda sólida fina,
     não o ring translúcido do vendor — é essa borda que faz o cartão parecer
     "recortado" do fundo, em vez de só uma mancha de cor um pouco mais clara. -->
<Card.Root size={ui?.size ?? 'default'} class={cn('border-border ring-0 border', ui?.class)}>
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
