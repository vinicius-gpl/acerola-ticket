<script module lang="ts">
	import type { Trend } from '$lib/utils/trend';

	export type AcerolaMetricTileProps = {
		data: {
			label: string;
			value: string;
			subtitle?: string;
			trend?: Trend;
			trendFormat?: (delta: number) => string;
			sparkline?: { timestamps: number[]; series: number[][] };
			bar?: { percent: number };
		};
		ui?: {
			colorVars?: string[];
			fixedMax?: number;
			class?: string;
			size?: 'default' | 'sm';
		};
	};
</script>

<script lang="ts">
	import AcerolaCard from '$lib/components/acerola-card/acerola-card.svelte';
	import AcerolaSegmentedBar from '$lib/components/acerola-segmented-bar/acerola-segmented-bar.svelte';
	import AcerolaSparkline from '$lib/components/acerola-sparkline/acerola-sparkline.svelte';
	import AcerolaTrendBadge from '$lib/components/acerola-trend-badge/acerola-trend-badge.svelte';
	import { cn } from '$lib/utils/cn';

	let { data, ui }: AcerolaMetricTileProps = $props();
</script>

<AcerolaCard ui={{ size: ui?.size, class: cn('h-full p-4 sm:p-5', ui?.class) }}>
	<div class="flex h-full flex-col justify-between">
		<div>
			<div class="flex items-center justify-between gap-2">
				<p class="text-muted-foreground text-[11px] font-semibold tracking-widest uppercase">
					{data.label}
				</p>
				{#if data.trend && data.trendFormat}
					<AcerolaTrendBadge data={{ trend: data.trend, format: data.trendFormat }} />
				{/if}
			</div>

			<div class="mt-2 flex items-baseline gap-2">
				<p class="text-foreground text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
					{data.value}
				</p>
			</div>

			{#if data.subtitle}
				<p class="text-muted-foreground mt-1 text-xs">{data.subtitle}</p>
			{/if}
		</div>

		{#if data.bar}
			<div class="mt-3 flex flex-col justify-end">
				<AcerolaSegmentedBar
					data={{ percent: data.bar.percent }}
					ui={{ colorVar: ui?.colorVars?.[0] ?? '--chart-4', height: 12 }}
				/>
			</div>
		{:else if data.sparkline}
			<div class="mt-2.5 min-h-[44px] flex-1">
				<AcerolaSparkline
					data={data.sparkline}
					ui={{ colorVars: ui?.colorVars ?? ['--chart-5'], fixedMax: ui?.fixedMax, height: 44 }}
				/>
			</div>
		{/if}
	</div>
</AcerolaCard>
