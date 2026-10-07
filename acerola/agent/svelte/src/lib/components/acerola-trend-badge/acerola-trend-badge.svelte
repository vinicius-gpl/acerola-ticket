<script module lang="ts">
	import type { Trend } from '$lib/utils/trend';

	export type AcerolaTrendBadgeProps = {
		data: { trend: Trend; format: (delta: number) => string };
		ui?: { class?: string };
	};
</script>

<script lang="ts">
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import { cn } from '$lib/utils/cn';

	let { data, ui }: AcerolaTrendBadgeProps = $props();

	const toneClass = $derived(
		{
			up: 'bg-destructive/10 text-destructive border-destructive/20',
			down: 'bg-success/10 text-success border-success/20',
			flat: 'bg-muted/70 text-muted-foreground border-border/60'
		}[data.trend.direction]
	);
</script>

<span
	class={cn(
		'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium tabular-nums shadow-xs',
		toneClass,
		ui?.class
	)}
>
	{#if data.trend.direction === 'up'}
		<ArrowUpIcon size={11} strokeWidth={2.2} />
	{:else if data.trend.direction === 'down'}
		<ArrowDownIcon size={11} strokeWidth={2.2} />
	{:else}
		<MinusIcon size={11} strokeWidth={2.2} />
	{/if}
	<span>{data.format(Math.abs(data.trend.delta))}</span>
</span>
