<script lang="ts">
	// Gráfico de série temporal usando uPlot — escolhido (em vez de Chart.js)
	// por ser leve e feito pra dado de alta frequência como este (ver
	// docs/ARQUITETURA.md). uPlot manipula um <canvas> direto, por isso o
	// wrapper aqui só cuida do ciclo de vida (criar/atualizar/destruir).
	import uPlot from 'uplot';
	import 'uplot/dist/uPlot.min.css';
	import { onDestroy, onMount } from 'svelte';
	import { useTheme } from '$lib/theme/theme.svelte';

	type Props = {
		data: { timestamps: number[]; series: number[][] };
		ui?: { colorVars: string[]; height?: number; fixedMax?: number };
	};

	let { data, ui }: Props = $props();

	let container: HTMLDivElement;
	let plot: uPlot | undefined;
	const theme = useTheme();

	function cssVar(name: string): string {
		return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	}

	function build() {
		plot?.destroy();
		const colorVars = ui?.colorVars ?? [];
		plot = new uPlot(
			{
				width: container.clientWidth || 1,
				height: ui?.height ?? 90,
				cursor: { show: false },
				legend: { show: false },
				axes: [{ show: false }, { show: false }],
				scales: { y: ui?.fixedMax ? { range: [0, ui.fixedMax] } : { auto: true } },
				series: [
					{},
					...colorVars.map((colorVar) => ({
						stroke: cssVar(colorVar),
						width: 1.5,
						points: { show: false }
					}))
				]
			},
			[data.timestamps, ...data.series],
			container
		);
	}

	onMount(() => {
		build();
		const resize = () => plot?.setSize({ width: container.clientWidth, height: ui?.height ?? 90 });
		window.addEventListener('resize', resize);
		return () => window.removeEventListener('resize', resize);
	});

	// Cores vêm de variáveis CSS; ao trocar de tema, os valores computados
	// mudam mas o uPlot já os "gravou" na criação — só um rebuild pega o
	// tema novo.
	$effect(() => {
		theme.value;
		if (plot) build();
	});

	$effect(() => {
		if (plot) plot.setData([data.timestamps, ...data.series]);
	});

	onDestroy(() => plot?.destroy());
</script>

<div bind:this={container} class="w-full"></div>
