<script module lang="ts">
	import type { Snippet } from 'svelte';

	export type AcerolaTooltipProps = {
		data?: {
			text?: string;
		};
		ui?: {
			side?: 'top' | 'right' | 'bottom' | 'left';
			align?: 'start' | 'center' | 'end';
			sideOffset?: number;
			class?: string;
			triggerClass?: string;
		};
	};
</script>

<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils/cn';

	let {
		data,
		ui,
		children,
		content
	}: AcerolaTooltipProps & {
		children?: Snippet;
		content?: Snippet;
	} = $props();
</script>

<Tooltip.Provider>
	<Tooltip.Root>
		<Tooltip.Trigger class={cn('inline-flex', ui?.triggerClass)}>
			{@render children?.()}
		</Tooltip.Trigger>
		<Tooltip.Content
			side={ui?.side ?? 'top'}
			align={ui?.align ?? 'center'}
			sideOffset={ui?.sideOffset ?? 4}
			class={ui?.class}
		>
			{#if content}
				{@render content()}
			{:else if data?.text}
				<span>{data.text}</span>
			{/if}
		</Tooltip.Content>
	</Tooltip.Root>
</Tooltip.Provider>
