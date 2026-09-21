<script lang="ts">
	import AcerolaBadge from '$lib/components/acerola-badge/acerola-badge.svelte';
	import AcerolaButton from '$lib/components/acerola-button/acerola-button.svelte';
	import AcerolaCard from '$lib/components/acerola-card/acerola-card.svelte';
	import AcerolaMetricTile from '$lib/components/acerola-metric-tile/acerola-metric-tile.svelte';
	import AcerolaPopover from '$lib/components/acerola-popover/acerola-popover.svelte';
	import AcerolaSeparator from '$lib/components/acerola-separator/acerola-separator.svelte';
	import AcerolaSparkline from '$lib/components/acerola-sparkline/acerola-sparkline.svelte';
	import AcerolaThemeToggle from '$lib/components/acerola-theme-toggle/acerola-theme-toggle.svelte';
	import AcerolaTooltip from '$lib/components/acerola-tooltip/acerola-tooltip.svelte';
	import InfoIcon from '@lucide/svelte/icons/info';
	import XIcon from '@lucide/svelte/icons/x';
	import { useMetrics } from '$lib/metrics/store.svelte';
	import { bytes, bytesPerSec, percent, uptime } from '$lib/utils/format';
	import { trend } from '$lib/utils/trend';
	import { HideWindow } from '../../../wailsjs/go/main/App';

	const metrics = useMetrics();

	const timestamps = $derived(metrics.history.map((_, index) => index));
	const last = (values: number[]) => values.at(-2);

	function sumBy<T>(items: T[], pick: (item: T) => number): number {
		return items.reduce((sum, item) => sum + pick(item), 0);
	}

	const cpuValues = $derived(metrics.history.map((snap) => snap.cpu.percentTotal));
	const memValues = $derived(metrics.history.map((snap) => snap.memory.usedPercent));
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
</script>

<div class="border-border bg-background flex h-full flex-col rounded-lg border shadow-2xl">
	<header
		data-drag-region
		class="border-border flex items-center justify-between border-b px-4 py-2"
	>
		<div class="flex items-center gap-2">
			<img src="/favicon.svg" alt="" class="h-7 w-7" />
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
			<AcerolaTooltip
				data={{
					text: metrics.latest ? 'Conectado · Atualização a cada 1s' : 'Conectando ao agente...'
				}}
			>
				<AcerolaBadge ui={{ tone: metrics.latest ? 'online' : 'default' }}>
					{metrics.latest ? 'ao vivo' : 'conectando'}
				</AcerolaBadge>
			</AcerolaTooltip>

			<AcerolaPopover
				data={{
					title: 'Sobre o Acerola Agent',
					description: 'Painel de telemetria em tempo real'
				}}
				ui={{ side: 'bottom', align: 'end' }}
			>
				{#snippet children()}
					<AcerolaButton ui={{ variant: 'ghost', size: 'icon', title: 'Informações do Agente' }}>
						<InfoIcon size={16} />
					</AcerolaButton>
				{/snippet}
				{#snippet content()}
					<div class="flex flex-col gap-2 pt-1 text-xs">
						<AcerolaSeparator />
						<div class="flex flex-col gap-1.5 py-1">
							<div class="flex justify-between">
								<span class="text-muted-foreground">Plataforma:</span>
								<span class="font-medium">{metrics.latest?.host.platform || '—'}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Arquitetura:</span>
								<span class="font-medium">{metrics.latest?.host.arch || '—'}</span>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Tempo ligado:</span>
								<span class="font-medium"
									>{metrics.latest ? uptime(metrics.latest.host.uptimeSeconds) : '—'}</span
								>
							</div>
							<div class="flex justify-between">
								<span class="text-muted-foreground">Taxa de amostragem:</span>
								<span class="font-medium">1000ms (1s)</span>
							</div>
						</div>
						<AcerolaSeparator />
						<p class="text-muted-foreground text-[11px] leading-relaxed">
							Para minimizar, feche esta janela. Para encerrar o agente, clique em <strong
								>Sair</strong
							> no menu da bandeja do Windows.
						</p>
					</div>
				{/snippet}
			</AcerolaPopover>

			<AcerolaTooltip data={{ text: 'Alternar tema (claro / escuro)' }}>
				<AcerolaThemeToggle />
			</AcerolaTooltip>

			<AcerolaTooltip data={{ text: 'Fechar dashboard (ocultar janela)' }}>
				<AcerolaButton
					events={{ onClick: () => HideWindow() }}
					ui={{ variant: 'ghost', size: 'icon', title: 'Fechar' }}
				>
					<XIcon size={16} />
				</AcerolaButton>
			</AcerolaTooltip>
		</div>
	</header>

	{#if metrics.latest}
		{@const snap = metrics.latest}
		<main class="min-h-0 flex-1 overflow-auto p-4">
			<!-- Camada 1: métricas — valor + tendência + sparkline compacta,
			     igual ao padrão de "KPI tile" do ReUI. -->
			<section class="grid grid-cols-4 gap-3">
				<AcerolaTooltip
					data={{ text: 'Uso agregado de processamento em todos os núcleos lógicos' }}
					ui={{ side: 'bottom', triggerClass: 'w-full' }}
				>
					<div class="w-full">
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
					</div>
				</AcerolaTooltip>
				<AcerolaTooltip
					data={{ text: 'Percentual de uso da memória física (RAM) do sistema' }}
					ui={{ side: 'bottom', triggerClass: 'w-full' }}
				>
					<div class="w-full">
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
					</div>
				</AcerolaTooltip>
				<AcerolaTooltip
					data={{ text: 'Velocidade agregada de download na rede por segundo' }}
					ui={{ side: 'bottom', triggerClass: 'w-full' }}
				>
					<div class="w-full">
						<AcerolaMetricTile
							data={{
								label: 'Rede ↓',
								value: bytesPerSec(netTotals.recv),
								sparkline: { timestamps, series: [netRecvValues] }
							}}
							ui={{ colorVars: ['--chart-5'] }}
						/>
					</div>
				</AcerolaTooltip>
				<AcerolaTooltip
					data={{ text: 'Velocidade agregada de leitura nos discos por segundo' }}
					ui={{ side: 'bottom', triggerClass: 'w-full' }}
				>
					<div class="w-full">
						<AcerolaMetricTile
							data={{
								label: 'Disco ↓',
								value: bytesPerSec(snap.diskIo.readBytesPerSec),
								sparkline: { timestamps, series: [diskReadValues] }
							}}
							ui={{ colorVars: ['--chart-3'] }}
						/>
					</div>
				</AcerolaTooltip>
			</section>

			<!-- Camada 2: gráficos maiores, com mais contexto por métrica. -->
			<section class="mt-3 grid grid-cols-2 gap-3">
				<AcerolaCard data={{ title: 'CPU por núcleo' }}>
					<AcerolaSparkline
						data={{ timestamps, series: [cpuValues] }}
						ui={{ colorVars: ['--chart-5'], fixedMax: 100, height: 110 }}
					/>
					<div class="mt-2 grid grid-cols-8 gap-0.5">
						{#each snap.cpu.percentPerCore as pct, index (index)}
							<AcerolaTooltip
								data={{ text: `Núcleo ${index}: ${pct.toFixed(1)}%` }}
								ui={{ side: 'top', class: 'text-xs' }}
							>
								<div class="bg-surface h-3 w-full cursor-pointer overflow-hidden rounded-sm">
									<div
										class="bg-chart-5 h-full transition-all duration-300"
										style={`width:${pct}%`}
									></div>
								</div>
							</AcerolaTooltip>
						{/each}
					</div>
				</AcerolaCard>

				<AcerolaCard data={{ title: 'Memória' }}>
					<AcerolaSparkline
						data={{ timestamps, series: [memValues] }}
						ui={{ colorVars: ['--chart-4'], fixedMax: 100, height: 110 }}
					/>
					<p class="text-muted-foreground mt-2 text-xs tabular-nums">
						{bytes(snap.memory.usedBytes)} usados de {bytes(snap.memory.totalBytes)}
					</p>
				</AcerolaCard>

				<AcerolaCard data={{ title: 'Rede' }}>
					<AcerolaSparkline
						data={{ timestamps, series: [netRecvValues, netSentValues] }}
						ui={{ colorVars: ['--chart-5', '--chart-2'], height: 110 }}
					/>
					<div class="text-muted-foreground mt-2 flex gap-4 text-xs">
						<AcerolaTooltip data={{ text: 'Recebimento de pacotes (Download)' }}>
							<span class="inline-flex cursor-pointer items-center">
								<span class="bg-chart-5 mr-1 inline-block h-2 w-2 rounded-full"></span>
								↓ {bytesPerSec(netTotals.recv)}
							</span>
						</AcerolaTooltip>
						<AcerolaTooltip data={{ text: 'Envio de pacotes (Upload)' }}>
							<span class="inline-flex cursor-pointer items-center">
								<span class="bg-chart-2 mr-1 inline-block h-2 w-2 rounded-full"></span>
								↑ {bytesPerSec(netTotals.sent)}
							</span>
						</AcerolaTooltip>
					</div>
				</AcerolaCard>

				<AcerolaCard data={{ title: 'Disco' }}>
					<AcerolaSparkline
						data={{ timestamps, series: [diskReadValues, diskWriteValues] }}
						ui={{ colorVars: ['--chart-3', '--chart-1'], height: 110 }}
					/>
					<div class="mt-2 flex flex-col gap-1.5">
						{#each snap.disks as disk (disk.mountpoint)}
							<div class="grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 text-xs">
								<span class="truncate font-medium" title={disk.mountpoint}>{disk.mountpoint}</span>
								<AcerolaTooltip
									data={{
										text: `${disk.mountpoint} (${disk.fstype}): ${disk.usedPercent.toFixed(1)}% ocupado · ${bytes(disk.usedBytes)} usados de ${bytes(disk.totalBytes)}`
									}}
									ui={{ triggerClass: 'w-full' }}
								>
									<span
										class="bg-surface block h-1.5 w-full cursor-pointer overflow-hidden rounded-full"
									>
										<span
											class="bg-primary block h-full transition-all duration-300"
											style={`width:${disk.usedPercent}%`}
										></span>
									</span>
								</AcerolaTooltip>
								<span class="text-muted-foreground">{bytes(disk.freeBytes)} livres</span>
							</div>
						{/each}
					</div>
				</AcerolaCard>
			</section>

			<!-- Camada 3: ação — tabela de processos e inventário. -->
			<section class="mt-3 grid grid-cols-3 gap-3">
				<AcerolaCard data={{ title: 'Processos' }} ui={{ class: 'col-span-2' }}>
					<div class="max-h-64 overflow-auto">
						<table class="w-full text-xs tabular-nums">
							<thead>
								<tr
									class="text-muted-foreground border-border sticky top-0 border-b bg-inherit text-left"
								>
									<th class="bg-card py-1 font-medium">PID</th>
									<th class="bg-card py-1 font-medium">Nome</th>
									<th class="bg-card py-1 font-medium">CPU %</th>
									<th class="bg-card py-1 font-medium">Mem %</th>
									<th class="bg-card py-1 font-medium">Memória</th>
									<th class="bg-card w-8 py-1 text-center font-medium">Info</th>
								</tr>
							</thead>
							<tbody>
								{#each snap.processes as proc (proc.pid)}
									<tr class="hover:bg-accent group">
										<td class="py-1">{proc.pid}</td>
										<td class="py-1 font-medium">{proc.name}</td>
										<td class="py-1">{proc.cpuPercent.toFixed(1)}</td>
										<td class="py-1">{proc.memPercent.toFixed(1)}</td>
										<td class="py-1">{bytes(proc.memBytes)}</td>
										<td class="py-1 text-center">
											<AcerolaPopover
												data={{
													title: proc.name,
													description: `PID: ${proc.pid}`
												}}
												ui={{ side: 'left', align: 'center', class: 'w-64' }}
											>
												{#snippet children()}
													<button
														class="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded p-0.5 opacity-60 transition-all group-hover:opacity-100"
														title="Detalhes do processo"
													>
														<InfoIcon size={13} />
													</button>
												{/snippet}
												{#snippet content()}
													<div class="flex flex-col gap-2 pt-1 text-xs">
														<AcerolaSeparator />
														<div class="grid grid-cols-2 gap-1.5 py-1">
															<div class="bg-muted/40 rounded p-1.5">
																<span class="text-muted-foreground block text-[10px] uppercase"
																	>Uso CPU</span
																>
																<span class="text-sm font-semibold"
																	>{proc.cpuPercent.toFixed(1)}%</span
																>
															</div>
															<div class="bg-muted/40 rounded p-1.5">
																<span class="text-muted-foreground block text-[10px] uppercase"
																	>Uso RAM</span
																>
																<span class="text-sm font-semibold"
																	>{proc.memPercent.toFixed(1)}%</span
																>
															</div>
														</div>
														<div class="flex items-center justify-between py-0.5">
															<span class="text-muted-foreground">RAM alocada:</span>
															<span class="font-mono font-medium">{bytes(proc.memBytes)}</span>
														</div>
													</div>
												{/snippet}
											</AcerolaPopover>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</AcerolaCard>

				<AcerolaCard data={{ title: 'Inventário' }}>
					<dl class="flex flex-col gap-1.5 text-xs">
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">Hostname</dt>
							<AcerolaTooltip data={{ text: `Nome do host: ${snap.host.hostname}` }}>
								<dd class="hover:text-primary cursor-pointer font-medium transition-colors">
									{snap.host.hostname}
								</dd>
							</AcerolaTooltip>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">IP local</dt>
							<AcerolaTooltip data={{ text: 'Endereço IPv4 atribuído pela rede local' }}>
								<dd class="cursor-pointer font-mono">{snap.host.localIp || '—'}</dd>
							</AcerolaTooltip>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">MAC</dt>
							<AcerolaTooltip data={{ text: 'Endereço físico de hardware (MAC)' }}>
								<dd class="cursor-pointer font-mono">{snap.host.macAddress || '—'}</dd>
							</AcerolaTooltip>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">Sistema</dt>
							<dd class="max-w-[160px] truncate text-right" title={snap.host.platform}>
								{snap.host.platform}
							</dd>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">Arquitetura</dt>
							<dd>{snap.host.arch}</dd>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">CPU</dt>
							<AcerolaTooltip data={{ text: snap.host.cpuModel }}>
								<dd class="max-w-[160px] cursor-pointer truncate text-right">
									{snap.host.cpuModel}
								</dd>
							</AcerolaTooltip>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">Núcleos</dt>
							<dd>{snap.host.logicalCpus} lóg. / {snap.host.physicalCpus} fís.</dd>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">Memória total</dt>
							<dd>{bytes(snap.host.totalMemoryBytes)}</dd>
						</div>
						<div class="flex items-center justify-between">
							<dt class="text-muted-foreground">Disco total</dt>
							<dd>{bytes(snap.host.totalDiskBytes)}</dd>
						</div>
					</dl>
				</AcerolaCard>
			</section>
		</main>
	{:else}
		<p class="text-muted-foreground flex-1 p-4 text-sm">Coletando métricas…</p>
	{/if}
</div>
