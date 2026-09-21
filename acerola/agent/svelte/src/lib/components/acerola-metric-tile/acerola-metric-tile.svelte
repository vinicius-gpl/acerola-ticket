<script module lang="ts">
	import type { Trend } from '$lib/utils/trend';

	export type AcerolaMetricTileProps = {
		data: {
			label: string;
			value: string;
			trend?: Trend;
			trendFormat?: (delta: number) => string;
			sparkline?: { timestamps: number[]; series: number[][] };
			// Medidor de capacidade (memória, disco): mostra o percentual atual em
			// vez de uma série no tempo — ver AcerolaSegmentedBar. Se os dois vierem
			// preenchidos, a barra tem prioridade (é a métrica mais "estável", uma
			// linha quase reta não ajuda tanto quanto o medidor de capacidade).
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

<AcerolaCard ui={{ size: ui?.size, class: cn('h-full', ui?.class) }}>
	<div class="flex h-full flex-col">
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
		<!-- flex-1 + items-center: a barra e a sparkline não têm a mesma altura
		     "natural" (a barra é um traço fino, a sparkline precisa de espaço pra
		     desenhar a onda) — centralizando na sobra, os quatro cartões do grupo
		     ficam com a mesma altura mesmo com conteúdos de tamanho diferente. -->
		{#if data.bar}
			<div class="mt-2.5 flex flex-1 items-center">
				<AcerolaSegmentedBar
					data={{ percent: data.bar.percent }}
					ui={{ colorVar: ui?.colorVars?.[0] ?? '--chart-4' }}
				/>
			</div>
		{:else if data.sparkline}
			<div class="mt-2 flex-1">
				<AcerolaSparkline
					data={data.sparkline}
					ui={{ colorVars: ui?.colorVars ?? ['--chart-5'], fixedMax: ui?.fixedMax, height: 40 }}
				/>
			</div>
		{/if}
	</div>
</AcerolaCard>
