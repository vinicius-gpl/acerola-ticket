<script module lang="ts">
	import type { Snippet } from 'svelte';

	export type AcerolaPopoverProps = {
		data?: {
			title?: string;
			description?: string;
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
	import * as Popover from '$lib/components/ui/popover';
	import { cn } from '$lib/utils/cn';

	let {
		data,
		ui,
		children,
		content
	}: AcerolaPopoverProps & {
		children?: Snippet;
		content?: Snippet;
	} = $props();
</script>

<Popover.Root>
	<Popover.Trigger class={cn('inline-flex', ui?.triggerClass)}>
		{@render children?.()}
	</Popover.Trigger>
	<Popover.Content
		side={ui?.side ?? 'bottom'}
		align={ui?.align ?? 'center'}
		sideOffset={ui?.sideOffset ?? 4}
		class={ui?.class}
	>
		{#if data?.title}
			<Popover.Header>
				<Popover.Title class="text-sm font-semibold">{data.title}</Popover.Title>
				{#if data?.description}
					<Popover.Description class="text-muted-foreground text-xs">
						{data.description}
					</Popover.Description>
				{/if}
			</Popover.Header>
		{/if}
		{#if content}
			{@render content()}
		{/if}
	</Popover.Content>
</Popover.Root>
