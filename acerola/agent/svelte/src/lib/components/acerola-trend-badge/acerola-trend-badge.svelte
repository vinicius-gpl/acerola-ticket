<script module lang="ts">
	import type { Trend } from '$lib/utils/trend';

	export type AcerolaTrendBadgeProps = {
		data: { trend: Trend; format: (delta: number) => string };
	};
</script>

<script lang="ts">
	import ArrowDownIcon from '@lucide/svelte/icons/arrow-down';
	import ArrowUpIcon from '@lucide/svelte/icons/arrow-up';
	import MinusIcon from '@lucide/svelte/icons/minus';
	import { cn } from '$lib/utils/cn';

	let { data }: AcerolaTrendBadgeProps = $props();

	const toneClass = $derived(
		{
			up: 'text-chart-1',
			down: 'text-chart-4',
			flat: 'text-muted-foreground'
		}[data.trend.direction]
	);
</script>

<span class={cn('inline-flex items-center gap-0.5 text-xs font-medium tabular-nums', toneClass)}>
	{#if data.trend.direction === 'up'}
		<ArrowUpIcon size={12} />
	{:else if data.trend.direction === 'down'}
		<ArrowDownIcon size={12} />
	{:else}
		<MinusIcon size={12} />
	{/if}
	{data.format(Math.abs(data.trend.delta))}
</span>
