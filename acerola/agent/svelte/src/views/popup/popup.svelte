<script lang="ts">
	import { onMount } from 'svelte';
	import AcerolaButton from '$lib/components/acerola-button/acerola-button.svelte';
	import AcerolaCard from '$lib/components/acerola-card/acerola-card.svelte';
	import AcerolaMetricTile from '$lib/components/acerola-metric-tile/acerola-metric-tile.svelte';
	import AcerolaThemeToggle from '$lib/components/acerola-theme-toggle/acerola-theme-toggle.svelte';
	import XIcon from '@lucide/svelte/icons/x';
	import { useMetrics } from '$lib/metrics/store.svelte';
	import { bytes, bytesPerSec, percent, uptime } from '$lib/utils/format';
	import { trend } from '$lib/utils/trend';
	import { HideWindow } from '../../../wailsjs/go/main/App';
	import { EventsOn } from '../../../wailsjs/runtime/runtime';

	const metrics = useMetrics();

	// "Fecha ao clicar fora": quando a janela perde o foco (blur), deve fechar imediatamente.
	// Porém, nos primeiros milissegundos após o Windows exibir a janela (especialmente ao abrir
	// a partir de outro monitor), o SO e o WebView2 podem disparar um blur transitório durante
	// a troca de foco do primeiro plano. Para não "abrir e fechar" instantaneamente, usamos uma
	// janela de tolerância de 200ms: se um blur ocorrer nesse intervalo, agendamos uma verificação;
	// se a janela de fato continuar sem foco ao término da transição, fechamos. Qualquer perda de foco
	// subsequente fecha a popup imediatamente.
	const STABILIZATION_MS = 200;
	let shownAt = 0;
	let pendingBlurTimer: ReturnType<typeof setTimeout> | null = null;

	function cancelPendingBlur() {
		if (pendingBlurTimer) {
			clearTimeout(pendingBlurTimer);
			pendingBlurTimer = null;
		}
	}

	function onWindowShown() {
		shownAt = Date.now();
		cancelPendingBlur();
		window.focus();
	}

	function onBlur() {
		cancelPendingBlur();
		const elapsed = Date.now() - shownAt;
		if (elapsed < STABILIZATION_MS) {
			pendingBlurTimer = setTimeout(
				() => {
					pendingBlurTimer = null;
					if (!document.hasFocus()) {
						HideWindow();
					}
				},
				STABILIZATION_MS - elapsed + 50
			);
			return;
		}

		HideWindow();
	}

	function onFocus() {
		cancelPendingBlur();
	}

	function onKeyDown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			HideWindow();
		}
	}

	onMount(() => {
		onWindowShown();

		const unsubChange = EventsOn('view:change', (view: string) => {
			if (view === 'popup') {
				onWindowShown();
			}
		});
		const unsubShown = EventsOn('window:shown', (view: string) => {
			if (view === 'popup') {
				onWindowShown();
			}
		});

		window.addEventListener('blur', onBlur);
		window.addEventListener('focus', onFocus);
		window.addEventListener('pointerdown', onFocus);
		window.addEventListener('keydown', onKeyDown);

		return () => {
			cancelPendingBlur();
			unsubChange();
			unsubShown();
			window.removeEventListener('blur', onBlur);
			window.removeEventListener('focus', onFocus);
			window.removeEventListener('pointerdown', onFocus);
			window.removeEventListener('keydown', onKeyDown);
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
		<div class="flex items-center gap-1">
			<AcerolaThemeToggle />
			<AcerolaButton
				events={{ onClick: () => HideWindow() }}
				ui={{ variant: 'ghost', size: 'icon', title: 'Fechar' }}
			>
				<XIcon size={16} />
			</AcerolaButton>
		</div>
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
