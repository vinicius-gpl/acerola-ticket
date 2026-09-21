<script module lang="ts">
	import type { Trend } from '$lib/utils/trend';

	export type AcerolaMetricTileProps = {
		data: {
			label: string;
			value: string;
			trend?: Trend;
			trendFormat?: (delta: number) => string;
			sparkline?: { timestamps: number[]; series: number[][] };
		};
		ui?: {
			colorVars?: string[];
			fixedMax?: number;
			class?: string;
		};
	};
</script>

<script lang="ts">
	import AcerolaCard from '$lib/components/acerola-card/acerola-card.svelte';
	import AcerolaSparkline from '$lib/components/acerola-sparkline/acerola-sparkline.svelte';
	import AcerolaTrendBadge from '$lib/components/acerola-trend-badge/acerola-trend-badge.svelte';

	let { data, ui }: AcerolaMetricTileProps = $props();
</script>

<AcerolaCard ui={{ class: ui?.class }}>
	<div class="flex items-start justify-between gap-2">
		<div>
			<p class="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
				{data.label}
			</p>
			<p class="text-xl font-semibold tabular-nums">{data.value}</p>
		</div>
		{#if data.trend && data.trendFormat}
			<AcerolaTrendBadge data={{ trend: data.trend, format: data.trendFormat }} />
		{/if}
	</div>
	{#if data.sparkline}
		<div class="mt-2">
			<AcerolaSparkline
				data={data.sparkline}
				ui={{ colorVars: ui?.colorVars ?? ['--chart-5'], fixedMax: ui?.fixedMax, height: 40 }}
			/>
		</div>
	{/if}
</AcerolaCard>
