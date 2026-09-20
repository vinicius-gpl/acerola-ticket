<script lang="ts">
	import { onMount } from 'svelte';
	import AcerolaCard from '$lib/components/acerola-card/acerola-card.svelte';
	import AcerolaMetricTile from '$lib/components/acerola-metric-tile/acerola-metric-tile.svelte';
	import AcerolaThemeToggle from '$lib/components/acerola-theme-toggle/acerola-theme-toggle.svelte';
	import { useMetrics } from '$lib/metrics/store.svelte';
	import { bytes, bytesPerSec, percent, uptime } from '$lib/utils/format';
	import { trend } from '$lib/utils/trend';
	import { HideWindow } from '../../../wailsjs/go/main/App';
	import { EventsOn } from '../../../wailsjs/runtime/runtime';

	const metrics = useMetrics();

	// "Fecha ao perder foco": para evitar fechar a popup logo na hora de abrir
	// (quando o Windows transfere foco entre monitores e o WebView2 dispara
	// eventos transitórios de foco/blur), a popup nasce DESARMADA para fechar.
	// O fechamento por blur só é armado após a janela estar visível e estável.
	let isArmed = false;
	let armTimer: ReturnType<typeof setTimeout> | null = null;

	function disarm() {
		isArmed = false;
		if (armTimer) {
			clearTimeout(armTimer);
			armTimer = null;
		}
	}

	function armAfterDelay(delayMs = 600) {
		disarm();
		armTimer = setTimeout(() => {
			isArmed = true;
			armTimer = null;
		}, delayMs);
	}

	function onBlur() {
		// Se ainda não armou (está no processo de abrir ou trocar de monitor), ignora o blur.
		if (!isArmed) return;
		disarm();
		HideWindow();
	}

	onMount(() => {
		const unsubChange = EventsOn('view:change', (view: string) => {
			if (view === 'popup') {
				disarm();
				armAfterDelay(700);
			}
		});
		const unsubShown = EventsOn('window:shown', (view: string) => {
			if (view === 'popup') {
				disarm();
				armAfterDelay(700);
			}
		});

		window.addEventListener('blur', onBlur);
		window.addEventListener('focus', () => armAfterDelay(400));
		window.addEventListener('pointerdown', () => armAfterDelay(300));

		return () => {
			disarm();
			unsubChange();
			unsubShown();
			window.removeEventListener('blur', onBlur);
		};
	});

	const timestamps = $derived(metrics.history.map((_, index) => index));
	const last = (values: number[]) => values.at(-2);

	const cpuValues = $derived(metrics.history.map((snap) => snap.cpu.percentTotal));
	const memValues = $derived(metrics.history.map((snap) => snap.memory.usedPercent));

	function sumBy<T>(items: T[], pick: (item: T) => number): number {
		return items.reduce((sum, item) => sum + pick(item), 0);
	}

	const netRecvValues = $derived(
		metrics.history.map((snap) => sumBy(snap.network, (n) => n.bytesRecvPerSec))
	);
	const diskReadValues = $derived(metrics.history.map((snap) => snap.diskIo.readBytesPerSec));
</script>

<div
	data-drag-region
	class="border-border bg-background flex h-full w-full flex-col gap-2 overflow-y-auto rounded-lg border p-3 shadow-2xl"
>
	<header class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<img src="/favicon.svg" alt="" class="h-6 w-6" />
			<span class="text-sm font-semibold">Acerola Agent</span>
		</div>
		<AcerolaThemeToggle />
	</header>

	{#if metrics.latest}
		{@const snap = metrics.latest}
		<AcerolaMetricTile
			data={{
				label: 'CPU',
				value: percent(snap.cpu.percentTotal),
				trend: trend(snap.cpu.percentTotal, last(cpuValues)),
				trendFormat: (delta) => `${delta.toFixed(0)}pp`,
				sparkline: { timestamps, series: [cpuValues] }
			}}
			ui={{ colorVars: ['--chart-5'], fixedMax: 100 }}
		/>

		<AcerolaMetricTile
			data={{
				label: 'Memória',
				value: percent(snap.memory.usedPercent),
				trend: trend(snap.memory.usedPercent, last(memValues)),
				trendFormat: (delta) => `${delta.toFixed(0)}pp`,
				sparkline: { timestamps, series: [memValues] }
			}}
			ui={{ colorVars: ['--chart-4'], fixedMax: 100 }}
		/>

		<AcerolaMetricTile
			data={{
				label: 'Rede (download)',
				value: bytesPerSec(sumBy(snap.network, (n) => n.bytesRecvPerSec)),
				sparkline: { timestamps, series: [netRecvValues] }
			}}
			ui={{ colorVars: ['--chart-5'] }}
		/>

		<AcerolaMetricTile
			data={{
				label: 'Disco (leitura)',
				value: bytesPerSec(snap.diskIo.readBytesPerSec),
				sparkline: { timestamps, series: [diskReadValues] }
			}}
			ui={{ colorVars: ['--chart-3'] }}
		/>

		<AcerolaCard data={{ title: 'Máquina' }}>
			<dl class="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
				<dt class="text-muted-foreground">Computador</dt>
				<dd class="text-right font-medium">{snap.host.hostname}</dd>
				<dt class="text-muted-foreground">IP local</dt>
				<dd class="text-right font-medium">{snap.host.localIp || '—'}</dd>
				<dt class="text-muted-foreground">Disco livre</dt>
				<dd class="text-right font-medium">{bytes(snap.host.freeDiskBytes)}</dd>
				<dt class="text-muted-foreground">Ligado há</dt>
				<dd class="text-right font-medium">{uptime(snap.host.uptimeSeconds)}</dd>
			</dl>
		</AcerolaCard>
	{:else}
		<p class="text-muted-foreground flex-1 text-sm">Coletando métricas…</p>
	{/if}
</div>
