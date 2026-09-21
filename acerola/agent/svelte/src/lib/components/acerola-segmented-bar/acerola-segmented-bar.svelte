<script module lang="ts">
	export type AcerolaSegmentedBarProps = {
		data: {
			percent: number;
		};
		ui?: {
			segments?: number;
			colorVar?: string;
			height?: number;
			class?: string;
		};
	};
</script>

<script lang="ts">
	// Medidor "de capacidade" (tipo o de bateria/sinal): em vez de uma linha só,
	// mostra vários tracinhos lado a lado, os primeiros acesos até o percentual
	// atual — melhor pra métrica que é "quanto já ocupei de um total" (memória,
	// disco) do que pra série temporal de verdade (isso continua com
	// AcerolaSparkline).
	import { cn } from '$lib/utils/cn';

	let { data, ui }: AcerolaSegmentedBarProps = $props();

	const segmentCount = $derived(ui?.segments ?? 32);
	const clampedPercent = $derived(Math.min(100, Math.max(0, data.percent)));
	const filledCount = $derived(Math.round((clampedPercent / 100) * segmentCount));
	const segmentIndexes = $derived(Array.from({ length: segmentCount }, (_, index) => index));
</script>

<div
	class={cn('flex items-center gap-0.5', ui?.class)}
	style={`height:${ui?.height ?? 14}px`}
	role="progressbar"
	aria-valuenow={Math.round(clampedPercent)}
	aria-valuemin={0}
	aria-valuemax={100}
>
	{#each segmentIndexes as index (index)}
		<div
			class="h-full min-w-0 flex-1 rounded-[1px] transition-colors duration-300"
			style={`background:${index < filledCount ? `var(${ui?.colorVar ?? '--chart-4'})` : 'var(--border)'}`}
		></div>
	{/each}
</div>
