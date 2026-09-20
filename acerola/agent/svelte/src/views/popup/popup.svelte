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

	// O Windows não dá foco garantido a uma janela que estava escondida só
	// porque chamamos WindowShow — é comum ela receber um foco/blur espúrio
	// logo na hora de aparecer, o que fechava a popup na mesma hora que
	// abria. Por isso ignoramos qualquer blur que aconteça logo depois de um
	// "view:change" pra "popup" (o Go emite esse evento toda vez que
	// ShowPopup roda, mesmo que a rota já fosse essa).
	const BLUR_GRACE_MS = 300;
	let shownAt = 0;

	// "Fecha ao perder foco": o WebView2 dispara blur no `window` do DOM
	// quando a janela nativa perde o foco — não precisa de nenhuma API
	// extra do Wails pra detectar isso.
	function onBlur() {
		if (Date.now() - shownAt < BLUR_GRACE_MS) return;
		HideWindow();
	}

	onMount(() => {
		const unsubscribe = EventsOn('view:change', (view: string) => {
			if (view === 'popup') shownAt = Date.now();
		});
		window.addEventListener('blur', onBlur);
		return () => {
			unsubscribe();
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
