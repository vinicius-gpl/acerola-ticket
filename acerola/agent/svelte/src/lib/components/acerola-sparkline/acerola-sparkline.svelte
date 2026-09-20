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

	// A janela nasce escondida (StartHidden, ver app.go) — nesse estado o
	// WebView2 ainda executa o JS, mas o container tem clientWidth 0 (não há
	// layout de verdade pra medir). Um listener de "resize" da window não
	// pega esse primeiro ajuste (mostrar a janela não dispara esse evento),
	// e o uPlot ficava travado num canvas de 1px pra sempre — daí o gráfico
	// aparecer torto/vazando da margem do card. ResizeObserver, ao
	// contrário, dispara assim que o elemento observado ganha um tamanho de
	// verdade (inclusive na primeira vez que a janela é mostrada), então
	// corrige sozinho tanto esse caso quanto trocas de tela (popup ↔
	// dashboard).
	onMount(() => {
		build();
		const observer = new ResizeObserver((entries) => {
			const width = entries[0]?.contentRect.width;
			if (width) plot?.setSize({ width, height: ui?.height ?? 90 });
		});
		observer.observe(container);
		return () => observer.disconnect();
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
