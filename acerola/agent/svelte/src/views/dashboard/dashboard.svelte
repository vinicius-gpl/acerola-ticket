<script lang="ts">
	import AcerolaBadge from '$lib/components/acerola-badge/acerola-badge.svelte';
	import AcerolaCard from '$lib/components/acerola-card/acerola-card.svelte';
	import AcerolaSparkline from '$lib/components/acerola-sparkline/acerola-sparkline.svelte';
	import AcerolaThemeToggle from '$lib/components/acerola-theme-toggle/acerola-theme-toggle.svelte';
	import { useMetrics } from '$lib/metrics/store.svelte';
	import { bytes, bytesPerSec, percent, uptime } from '$lib/utils/format';

	const metrics = useMetrics();

	const timestamps = $derived(metrics.history.map((_, index) => index));

	const cpuSeries = $derived({
		timestamps,
		series: [metrics.history.map((snap) => snap.cpu.percentTotal)]
	});

	const memSeries = $derived({
		timestamps,
		series: [metrics.history.map((snap) => snap.memory.usedPercent)]
	});

	const netSeries = $derived({
		timestamps,
		series: [
			metrics.history.map((snap) => sumBy(snap.network, (n) => n.bytesRecvPerSec)),
			metrics.history.map((snap) => sumBy(snap.network, (n) => n.bytesSentPerSec))
		]
	});

	const diskSeries = $derived({
		timestamps,
		series: [
			metrics.history.map((snap) => snap.diskIo.readBytesPerSec),
			metrics.history.map((snap) => snap.diskIo.writeBytesPerSec)
		]
	});

	function sumBy<T>(items: T[], pick: (item: T) => number): number {
		return items.reduce((sum, item) => sum + pick(item), 0);
	}

	const netTotals = $derived.by(() => {
		const snap = metrics.latest;
		if (!snap) return { recv: 0, sent: 0 };
		return {
			recv: sumBy(snap.network, (n) => n.bytesRecvPerSec),
			sent: sumBy(snap.network, (n) => n.bytesSentPerSec)
		};
	});
</script>

<div class="flex h-full flex-col">
	<header
		data-drag-region
		class="border-border flex items-center justify-between border-b px-4 py-2"
	>
		<div class="flex items-center gap-2">
			<img src="/favicon.svg" alt="" class="h-6 w-6" />
			<div>
				<h1 class="text-sm font-semibold">Acerola Agent</h1>
				{#if metrics.latest}
					<p class="text-muted-foreground text-xs">
						{metrics.latest.host.hostname} · {metrics.latest.host.platform} · online há {uptime(
							metrics.latest.host.uptimeSeconds
						)}
					</p>
				{/if}
			</div>
		</div>
		<div class="flex items-center gap-2">
			<AcerolaBadge ui={{ tone: metrics.latest ? 'online' : 'default' }}>
				{metrics.latest ? 'ao vivo' : 'conectando'}
			</AcerolaBadge>
			<AcerolaThemeToggle />
		</div>
	</header>

	{#if metrics.latest}
		{@const snap = metrics.latest}
		<main class="grid flex-1 grid-cols-3 gap-3 overflow-auto p-3">
			<AcerolaCard data={{ title: 'CPU' }}>
				<p class="mb-1 text-lg font-semibold tabular-nums">{percent(snap.cpu.percentTotal)}</p>
				<AcerolaSparkline data={cpuSeries} ui={{ colorVars: ['--chart-5'], fixedMax: 100 }} />
				<div class="mt-2 grid grid-cols-8 gap-0.5">
					{#each snap.cpu.percentPerCore as pct, index (index)}
						<div class="bg-surface h-3 overflow-hidden rounded-sm" title={`núcleo ${index}`}>
							<div class="bg-chart-5 h-full" style={`width:${pct}%`}></div>
						</div>
					{/each}
				</div>
			</AcerolaCard>

			<AcerolaCard data={{ title: 'Memória' }}>
				<p class="mb-1 text-lg font-semibold tabular-nums">{percent(snap.memory.usedPercent)}</p>
				<AcerolaSparkline data={memSeries} ui={{ colorVars: ['--chart-4'], fixedMax: 100 }} />
				<p class="text-muted-foreground mt-2 text-xs tabular-nums">
					{bytes(snap.memory.usedBytes)} usados de {bytes(snap.memory.totalBytes)}
				</p>
			</AcerolaCard>

			<AcerolaCard data={{ title: 'Rede' }}>
				<p class="mb-1 text-lg font-semibold tabular-nums">
					↓{bytesPerSec(netTotals.recv)} ↑{bytesPerSec(netTotals.sent)}
				</p>
				<AcerolaSparkline data={netSeries} ui={{ colorVars: ['--chart-5', '--chart-2'] }} />
			</AcerolaCard>

			<AcerolaCard data={{ title: 'Disco' }}>
				<p class="mb-1 text-lg font-semibold tabular-nums">
					↓{bytesPerSec(snap.diskIo.readBytesPerSec)} ↑{bytesPerSec(snap.diskIo.writeBytesPerSec)}
				</p>
				<AcerolaSparkline data={diskSeries} ui={{ colorVars: ['--chart-3', '--chart-1'] }} />
				<div class="mt-2 flex flex-col gap-1">
					{#each snap.disks as disk (disk.mountpoint)}
						<div class="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 text-xs">
							<span class="truncate" title={disk.mountpoint}>{disk.mountpoint}</span>
							<span class="bg-surface h-1.5 overflow-hidden rounded-full">
								<span class="bg-primary block h-full" style={`width:${disk.usedPercent}%`}></span>
							</span>
							<span class="text-muted-foreground">{bytes(disk.freeBytes)} livres</span>
						</div>
					{/each}
				</div>
			</AcerolaCard>

			<AcerolaCard data={{ title: 'Processos' }} ui={{ class: 'col-span-2 row-span-2' }}>
				<div class="max-h-full overflow-auto">
					<table class="w-full text-xs tabular-nums">
						<thead>
							<tr class="text-muted-foreground border-border border-b text-left">
								<th class="py-1 font-medium">PID</th>
								<th class="py-1 font-medium">Nome</th>
								<th class="py-1 font-medium">CPU %</th>
								<th class="py-1 font-medium">Mem %</th>
								<th class="py-1 font-medium">Memória</th>
							</tr>
						</thead>
						<tbody>
							{#each snap.processes as proc (proc.pid)}
								<tr class="hover:bg-accent">
									<td class="py-0.5">{proc.pid}</td>
									<td class="py-0.5">{proc.name}</td>
									<td class="py-0.5">{proc.cpuPercent.toFixed(1)}</td>
									<td class="py-0.5">{proc.memPercent.toFixed(1)}</td>
									<td class="py-0.5">{bytes(proc.memBytes)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</AcerolaCard>

			<AcerolaCard data={{ title: 'Inventário' }} ui={{ class: 'col-span-2' }}>
				<dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Hostname</dt>
						<dd>{snap.host.hostname}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">IP local</dt>
						<dd>{snap.host.localIp || '—'}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">MAC</dt>
						<dd>{snap.host.macAddress || '—'}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Sistema</dt>
						<dd>{snap.host.platform} {snap.host.platformVersion}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Arquitetura</dt>
						<dd>{snap.host.arch}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">CPU</dt>
						<dd class="truncate">{snap.host.cpuModel}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Núcleos</dt>
						<dd>{snap.host.logicalCpus} lóg. / {snap.host.physicalCpus} fís.</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Memória total</dt>
						<dd>{bytes(snap.host.totalMemoryBytes)}</dd>
					</div>
					<div class="flex justify-between">
						<dt class="text-muted-foreground">Disco total</dt>
						<dd>{bytes(snap.host.totalDiskBytes)}</dd>
					</div>
				</dl>
			</AcerolaCard>
		</main>
	{:else}
		<p class="text-muted-foreground flex-1 p-4 text-sm">Coletando métricas…</p>
	{/if}
</div>
