<script lang="ts">
	import { onMount } from 'svelte';
	import AcerolaBadge from '$lib/components/acerola-badge/acerola-badge.svelte';
	import AcerolaButton from '$lib/components/acerola-button/acerola-button.svelte';
	import AcerolaCard from '$lib/components/acerola-card/acerola-card.svelte';
	import AcerolaMetricTile from '$lib/components/acerola-metric-tile/acerola-metric-tile.svelte';
	import AcerolaSegmentedBar from '$lib/components/acerola-segmented-bar/acerola-segmented-bar.svelte';
	import AcerolaThemeToggle from '$lib/components/acerola-theme-toggle/acerola-theme-toggle.svelte';
	import AcerolaTooltip from '$lib/components/acerola-tooltip/acerola-tooltip.svelte';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import MonitorIcon from '@lucide/svelte/icons/monitor';
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
	const netSentValues = $derived(
		metrics.history.map((snap) => sumBy(snap.network, (n) => n.bytesSentPerSec))
	);
	const diskReadValues = $derived(metrics.history.map((snap) => snap.diskIo.readBytesPerSec));
	const diskWriteValues = $derived(metrics.history.map((snap) => snap.diskIo.writeBytesPerSec));

	const netTotals = $derived.by(() => {
		const snap = metrics.latest;
		if (!snap) return { recv: 0, sent: 0 };
		return {
			recv: sumBy(snap.network, (n) => n.bytesRecvPerSec),
			sent: sumBy(snap.network, (n) => n.bytesSentPerSec)
		};
	});

	const diskTotals = $derived.by(() => {
		const snap = metrics.latest;
		if (!snap) return { read: 0, write: 0 };
		return {
			read: snap.diskIo.readBytesPerSec,
			write: snap.diskIo.writeBytesPerSec
		};
	});
</script>

<div
	class="border-border bg-background flex h-full w-full flex-col overflow-hidden rounded-lg border shadow-2xl"
>
	<header
		data-drag-region
		class="border-border flex shrink-0 items-center justify-between border-b px-3 py-2 select-none"
	>
		<div class="flex items-center gap-2">
			<img src="/favicon.svg" alt="" class="pointer-events-none h-6 w-6" />
			<span class="pointer-events-none text-sm font-semibold">Acerola Agent</span>
		</div>
		<div class="flex items-center gap-1">
			<AcerolaTooltip data={{ text: metrics.latest ? 'Conectado · Ao vivo' : 'Conectando...' }}>
				<AcerolaBadge
					ui={{ tone: metrics.latest ? 'online' : 'default', class: 'text-[10px] px-1.5 py-0 h-5' }}
				>
					{metrics.latest ? 'ao vivo' : 'conectando'}
				</AcerolaBadge>
			</AcerolaTooltip>
			<AcerolaThemeToggle />
			<AcerolaTooltip data={{ text: 'Fechar (Esc)' }}>
				<AcerolaButton
					events={{ onClick: () => HideWindow() }}
					ui={{ variant: 'ghost', size: 'icon', title: 'Fechar' }}
				>
					<XIcon size={16} />
				</AcerolaButton>
			</AcerolaTooltip>
		</div>
	</header>

	<main class="min-h-0 flex-1 overflow-y-auto p-3">
		{#if metrics.latest}
			{@const snap = metrics.latest}
			<div class="flex flex-col gap-2">
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
						value: `${percent(snap.memory.usedPercent)} (${bytes(snap.memory.usedBytes)} / ${bytes(snap.memory.totalBytes)})`,
						trend: trend(snap.memory.usedPercent, last(memValues)),
						trendFormat: (delta) => `${delta.toFixed(0)}pp`,
						sparkline: { timestamps, series: [memValues] }
					}}
					ui={{ colorVars: ['--chart-4'], fixedMax: 100 }}
				/>

				<AcerolaMetricTile
					data={{
						label: 'Rede',
						value: `↓ ${bytesPerSec(netTotals.recv)} · ↑ ${bytesPerSec(netTotals.sent)}`,
						sparkline: { timestamps, series: [netRecvValues, netSentValues] }
					}}
					ui={{ colorVars: ['--chart-5', '--chart-2'] }}
				/>

				<AcerolaMetricTile
					data={{
						label: 'Disco I/O',
						value: `R: ${bytesPerSec(diskTotals.read)} · W: ${bytesPerSec(diskTotals.write)}`,
						sparkline: { timestamps, series: [diskReadValues, diskWriteValues] }
					}}
					ui={{ colorVars: ['--chart-3', '--chart-1'] }}
				/>

				{#if snap.processes && snap.processes.length > 0}
					<AcerolaCard data={{ title: 'Top Processos' }} ui={{ size: 'sm' }}>
						<div class="flex flex-col gap-1 text-xs tabular-nums">
							{#each snap.processes.slice(0, 3) as proc (proc.pid)}
								<div
									class="hover:bg-muted/40 flex items-center justify-between gap-2 rounded px-1 py-0.5 transition-colors"
								>
									<span class="min-w-0 flex-1 truncate font-medium" title={proc.name}>
										{proc.name}
									</span>
									<div class="text-muted-foreground flex shrink-0 items-center gap-2.5 text-[11px]">
										<span class="text-foreground font-medium">{proc.cpuPercent.toFixed(1)}%</span>
										<span>{bytes(proc.memBytes)}</span>
									</div>
								</div>
							{/each}
						</div>
					</AcerolaCard>
				{/if}

				<AcerolaCard data={{ title: 'Máquina' }} ui={{ size: 'sm' }}>
					<div class="flex flex-col gap-2.5">
						<!-- Hostname e Sistema Operacional -->
						<div class="flex items-center justify-between gap-2">
							<div class="flex min-w-0 items-center gap-1.5">
								<MonitorIcon size={14} class="text-muted-foreground shrink-0" />
								<span class="truncate text-xs font-semibold" title={snap.host.hostname}>
									{snap.host.hostname}
								</span>
							</div>
							<AcerolaBadge ui={{ tone: 'default', class: 'text-[10px] px-1.5 py-0 h-4 shrink-0' }}>
								{snap.host.platform || snap.host.os}
							</AcerolaBadge>
						</div>

						<!-- Grid de Informações: IP Local e Uptime -->
						<div class="grid grid-cols-2 gap-2 text-xs">
							<div class="bg-muted/40 flex flex-col gap-0.5 rounded-md p-1.5">
								<span class="text-muted-foreground text-[10px] font-medium uppercase">IP Local</span
								>
								<span class="truncate font-mono text-xs font-medium"
									>{snap.host.localIp || '—'}</span
								>
							</div>
							<div class="bg-muted/40 flex flex-col gap-0.5 rounded-md p-1.5">
								<span
									class="text-muted-foreground flex items-center gap-1 text-[10px] font-medium uppercase"
								>
									<ClockIcon size={10} />
									Ligado há
								</span>
								<span class="truncate text-xs font-medium">{uptime(snap.host.uptimeSeconds)}</span>
							</div>
						</div>

						<!-- Armazenamento / Partições -->
						{#if snap.disks && snap.disks.length > 0}
							<div class="flex flex-col gap-1.5">
								{#each snap.disks as disk (disk.mountpoint)}
									<div class="flex flex-col gap-0.5">
										<div class="flex items-center justify-between text-xs">
											<span
												class="text-muted-foreground flex max-w-[140px] items-center gap-1 truncate text-[11px] font-medium"
											>
												<HardDriveIcon size={11} class="shrink-0" />
												{disk.mountpoint} ({disk.fstype})
											</span>
											<span class="text-[11px] font-medium tabular-nums">
												{bytes(disk.freeBytes)} livres ({Math.round(100 - disk.usedPercent)}%)
											</span>
										</div>
										<AcerolaSegmentedBar
											data={{ percent: disk.usedPercent }}
											ui={{ colorVar: '--chart-3', segments: 24, height: 8 }}
										/>
									</div>
								{/each}
							</div>
						{:else if snap.host.totalDiskBytes > 0}
							{@const usedDisk = snap.host.totalDiskBytes - snap.host.freeDiskBytes}
							{@const diskPct = Math.round((usedDisk / snap.host.totalDiskBytes) * 100)}
							<div class="flex flex-col gap-1">
								<div class="flex items-center justify-between text-xs">
									<span class="text-muted-foreground flex items-center gap-1 text-[11px]">
										<HardDriveIcon size={11} />
										Disco principal
									</span>
									<span class="text-[11px] font-medium tabular-nums">
										{bytes(snap.host.freeDiskBytes)} livres ({100 - diskPct}%)
									</span>
								</div>
								<AcerolaSegmentedBar
									data={{ percent: diskPct }}
									ui={{ colorVar: '--chart-3', segments: 24, height: 8 }}
								/>
							</div>
						{/if}

						<!-- Detalhes de Processador e Memória -->
						<div
							class="text-muted-foreground border-border/50 flex items-center justify-between border-t pt-1 text-[11px]"
						>
							<span class="mr-2 flex items-center gap-1 truncate" title={snap.host.cpuModel}>
								<CpuIcon size={12} class="shrink-0" />
								{snap.host.logicalCpus} núcleos · {snap.host.arch}
							</span>
							<span class="shrink-0 font-medium">RAM: {bytes(snap.host.totalMemoryBytes)}</span>
						</div>
					</div>
				</AcerolaCard>
			</div>
		{:else}
			<p class="text-muted-foreground flex-1 text-sm">Coletando métricas…</p>
		{/if}
	</main>
</div>
