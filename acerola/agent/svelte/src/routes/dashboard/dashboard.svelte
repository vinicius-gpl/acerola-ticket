<script lang="ts">
	import AcerolaBadge from '$lib/components/acerola-badge/acerola-badge.svelte';
	import AcerolaButton from '$lib/components/acerola-button/acerola-button.svelte';
	import AcerolaCard from '$lib/components/acerola-card/acerola-card.svelte';
	import AcerolaMetricTile from '$lib/components/acerola-metric-tile/acerola-metric-tile.svelte';
	import AcerolaProcessTable from '$lib/components/acerola-process-table/acerola-process-table.svelte';
	import AcerolaProcessDrawer from '$lib/components/acerola-process-drawer/acerola-process-drawer.svelte';
	import AcerolaPopover from '$lib/components/acerola-popover/acerola-popover.svelte';
	import AcerolaSegmentedBar from '$lib/components/acerola-segmented-bar/acerola-segmented-bar.svelte';
	import AcerolaSeparator from '$lib/components/acerola-separator/acerola-separator.svelte';
	import AcerolaSparkline from '$lib/components/acerola-sparkline/acerola-sparkline.svelte';
	import AcerolaThemeToggle from '$lib/components/acerola-theme-toggle/acerola-theme-toggle.svelte';
	import AcerolaTooltip from '$lib/components/acerola-tooltip/acerola-tooltip.svelte';

	import ActivityIcon from '@lucide/svelte/icons/activity';
	import ClockIcon from '@lucide/svelte/icons/clock';
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import InfoIcon from '@lucide/svelte/icons/info';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import LayoutPanelLeftIcon from '@lucide/svelte/icons/layout-panel-left';
	import NetworkIcon from '@lucide/svelte/icons/network';
	import ServerIcon from '@lucide/svelte/icons/server';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import ShieldCheckIcon from '@lucide/svelte/icons/shield-check';
	import XIcon from '@lucide/svelte/icons/x';

	import { useMetrics } from '$lib/hooks/use-metrics/use-metrics.svelte';
	import { bytes, bytesPerSec, percent, uptime } from '$lib/utils/format';
	import { trend } from '$lib/utils/trend';
	import { cn } from '$lib/utils/cn';

	import { HideWindow, ShowSettings } from '../../../wailsjs/go/main/App';

	const metrics = useMetrics();
	type DashboardTab = 'overview' | 'queue' | 'system';
	let activeTab = $state<DashboardTab>('overview');

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

<div class="bg-background text-foreground flex h-full flex-col overflow-hidden rounded-2xl">
	<!-- Header Chrome com Estilo Moderno ReUI / VibePrompts -->
	<header
		data-drag-region
		class="border-border/70 bg-card flex shrink-0 items-center justify-between border-b px-5 py-2.5 select-none"
	>
		<!-- Lado Esquerdo: Identidade do Agente & Host -->
		<div class="flex items-center gap-3">
			<div class="relative flex items-center justify-center">
				<img src="/favicon.svg" alt="Acerola" class="h-8 w-8" />
			</div>

			<div>
				<div class="flex items-center gap-2">
					<h1 class="text-foreground text-sm font-semibold tracking-tight">Acerola Agent</h1>

					<span
						class="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"
					>
						<span class="relative flex h-1.5 w-1.5">
							<span
								class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"
							></span>
							<span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
						</span>
						{metrics.latest ? 'Ao vivo' : 'Conectando'}
					</span>
				</div>

				{#if metrics.latest}
					<p class="text-muted-foreground text-[11px]">
						{metrics.latest.host.hostname} · {metrics.latest.host.platform} · online há {uptime(
							metrics.latest.host.uptimeSeconds
						)}
					</p>
				{/if}
			</div>
		</div>

		<!-- Centro: Switcher de Abas / Navegação -->
		<nav
			class="border-border/70 bg-muted/30 hidden items-center gap-1 rounded-xl border p-1 md:flex"
		>
			<button
				type="button"
				class={cn(
					'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
					activeTab === 'overview'
						? 'bg-card text-foreground font-semibold shadow-xs'
						: 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => (activeTab = 'overview')}
			>
				<LayoutDashboardIcon size={14} />
				<span>Visão Geral</span>
			</button>

			<button
				type="button"
				class={cn(
					'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
					activeTab === 'queue'
						? 'bg-card text-foreground font-semibold shadow-xs'
						: 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => (activeTab = 'queue')}
			>
				<LayoutPanelLeftIcon size={14} />
				<span>Fila & Detalhes</span>
				{#if metrics.latest?.processes}
					<span
						class="bg-primary/10 border-primary/20 py-0.2 text-primary rounded-full border px-1.5 text-[10px] font-semibold"
					>
						{metrics.latest.processes.length}
					</span>
				{/if}
			</button>

			<button
				type="button"
				class={cn(
					'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
					activeTab === 'system'
						? 'bg-card text-foreground font-semibold shadow-xs'
						: 'text-muted-foreground hover:text-foreground'
				)}
				onclick={() => (activeTab = 'system')}
			>
				<HardDriveIcon size={14} />
				<span>Armazenamento & SO</span>
			</button>
		</nav>

		<!-- Lado Direito: Ações & Controles -->
		<div class="flex items-center gap-2">
			<!-- A configuração é OUTRA tela: aqui fica só a porta para ela. -->
			<AcerolaButton
				ui={{ variant: 'ghost', size: 'icon', title: 'Configuração do agente' }}
				events={{ onClick: () => void ShowSettings() }}
			>
				<SettingsIcon size={16} />
			</AcerolaButton>

			<span
				class="border-border/70 bg-muted/40 text-muted-foreground hidden rounded-full border px-2.5 py-1 font-mono text-[11px] sm:inline-flex"
			>
				1000ms
			</span>

			<AcerolaPopover
				data={{
					title: 'Sobre o Acerola Agent',
					description: 'Painel de telemetria e diagnóstico do sistema operacional'
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
								<span class="text-foreground font-medium"
									>{metrics.latest?.host.platform || '—'}</span
								>
							</div>

							<div class="flex justify-between">
								<span class="text-muted-foreground">Arquitetura:</span>
								<span class="text-foreground font-medium">{metrics.latest?.host.arch || '—'}</span>
							</div>

							<div class="flex justify-between">
								<span class="text-muted-foreground">Tempo ativo:</span>
								<span class="text-foreground font-medium">
									{metrics.latest ? uptime(metrics.latest.host.uptimeSeconds) : '—'}
								</span>
							</div>

							<div class="flex justify-between">
								<span class="text-muted-foreground">Amostragem:</span>
								<span class="text-foreground font-medium">1000ms (1s contínuo)</span>
							</div>
						</div>

						<AcerolaSeparator />

						<p class="text-muted-foreground text-[11px] leading-relaxed">
							Para minimizar, feche esta janela. Para encerrar o agente, selecione <strong
								>Sair</strong
							> no menu da bandeja.
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

		<main class="min-h-0 flex-1 overflow-auto p-5">
			<!-- ABA 1: VISÃO GERAL -->
			{#if activeTab === 'overview'}
				<!-- Camada 1: ReUI KPI Stat Cards Row -->
				<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<AcerolaTooltip
						data={{ text: 'Uso agregado de processamento em todos os núcleos lógicos' }}
						ui={{ side: 'bottom', triggerClass: 'w-full h-full' }}
					>
						<div class="h-full w-full">
							<AcerolaMetricTile
								data={{
									label: 'CPU',
									value: percent(snap.cpu.percentTotal),
									subtitle: `Uso agregado em ${snap.host.logicalCpus} núcleos`,
									trend: trend(snap.cpu.percentTotal, last(cpuValues)),
									trendFormat: (delta) => `${delta.toFixed(0)}pp`,
									sparkline: { timestamps, series: [cpuValues] }
								}}
								ui={{
									colorVars: ['--chart-5'],
									fixedMax: 100
								}}
							/>
						</div>
					</AcerolaTooltip>

					<AcerolaTooltip
						data={{ text: 'Percentual de uso da memória física (RAM) do sistema' }}
						ui={{ side: 'bottom', triggerClass: 'w-full h-full' }}
					>
						<div class="h-full w-full">
							<AcerolaMetricTile
								data={{
									label: 'Memória',
									value: percent(snap.memory.usedPercent),
									subtitle: `${bytes(snap.memory.usedBytes)} usados de ${bytes(snap.memory.totalBytes)}`,
									trend: trend(snap.memory.usedPercent, last(memValues)),
									trendFormat: (delta) => `${delta.toFixed(0)}pp`,
									bar: { percent: snap.memory.usedPercent }
								}}
								ui={{
									colorVars: ['--chart-4'],
									fixedMax: 100
								}}
							/>
						</div>
					</AcerolaTooltip>

					<AcerolaTooltip
						data={{ text: 'Velocidade de transferência da interface de rede por segundo' }}
						ui={{ side: 'bottom', triggerClass: 'w-full h-full' }}
					>
						<div class="h-full w-full">
							<AcerolaMetricTile
								data={{
									label: 'Rede',
									value: bytesPerSec(netTotals.recv),
									subtitle: `↓ ${bytesPerSec(netTotals.recv)} · ↑ ${bytesPerSec(netTotals.sent)}`,
									sparkline: { timestamps, series: [netRecvValues, netSentValues] }
								}}
								ui={{
									colorVars: ['--chart-5', '--chart-2']
								}}
							/>
						</div>
					</AcerolaTooltip>

					<AcerolaTooltip
						data={{ text: 'Velocidade agregada de leitura e gravação nos discos' }}
						ui={{ side: 'bottom', triggerClass: 'w-full h-full' }}
					>
						<div class="h-full w-full">
							<AcerolaMetricTile
								data={{
									label: 'Disco I/O',
									value: bytesPerSec(snap.diskIo.readBytesPerSec),
									subtitle: `Leitura: ${bytesPerSec(snap.diskIo.readBytesPerSec)} · Grav.: ${bytesPerSec(snap.diskIo.writeBytesPerSec)}`,
									sparkline: { timestamps, series: [diskReadValues, diskWriteValues] }
								}}
								ui={{
									colorVars: ['--chart-3', '--chart-1']
								}}
							/>
						</div>
					</AcerolaTooltip>
				</section>

				<!-- Camada 2: Gráficos Maiores e Telemetria Visual -->
				<section class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
					<!-- Card CPU por Núcleo -->
					<AcerolaCard data={{ title: 'CPU por Núcleo Lógico' }} ui={{ class: 'h-full p-4' }}>
						<div class="mb-2 flex items-center justify-between">
							<span class="text-foreground text-2xl font-semibold tracking-tight tabular-nums">
								{percent(snap.cpu.percentTotal)}
							</span>
							<span class="text-muted-foreground text-xs">
								{snap.cpu.percentPerCore.length} núcleos ativos
							</span>
						</div>

						<AcerolaSparkline
							data={{ timestamps, series: [cpuValues] }}
							ui={{ colorVars: ['--chart-5'], fixedMax: 100, height: 95 }}
						/>

						<div class="border-border/60 mt-3 border-t pt-2.5">
							<div
								class="text-muted-foreground mb-1.5 flex items-center justify-between text-[11px]"
							>
								<span>Carga individual dos núcleos</span>
								<span>Pico recente</span>
							</div>

							<div class="grid grid-cols-8 gap-1 sm:grid-cols-12 md:grid-cols-16">
								{#each snap.cpu.percentPerCore as pct, index (index)}
									<AcerolaTooltip
										data={{ text: `Núcleo #${index}: ${pct.toFixed(1)}%` }}
										ui={{ side: 'top', class: 'text-xs' }}
									>
										<div
											class="bg-muted/80 border-border/40 h-4 w-full cursor-pointer overflow-hidden rounded-[3px] border"
										>
											<div
												class="bg-primary h-full transition-all duration-300"
												style={`width: ${pct}%`}
											></div>
										</div>
									</AcerolaTooltip>
								{/each}
							</div>
						</div>
					</AcerolaCard>

					<!-- Card Memória RAM -->
					<AcerolaCard data={{ title: 'Memória Física (RAM)' }} ui={{ class: 'h-full p-4' }}>
						<div class="flex items-center justify-between">
							<span class="text-foreground text-2xl font-semibold tracking-tight tabular-nums">
								{percent(snap.memory.usedPercent)}
							</span>
							<span class="text-muted-foreground font-mono text-xs tabular-nums">
								{bytes(snap.memory.usedBytes)} / {bytes(snap.memory.totalBytes)}
							</span>
						</div>

						<div class="mt-2">
							<AcerolaSparkline
								data={{ timestamps, series: [memValues] }}
								ui={{ colorVars: ['--chart-4'], fixedMax: 100, height: 75 }}
							/>
						</div>

						<div class="border-border/60 mt-3 border-t pt-2.5">
							<AcerolaSegmentedBar
								data={{ percent: snap.memory.usedPercent }}
								ui={{ colorVar: '--chart-4', segments: 32, height: 16 }}
							/>

							<div class="text-muted-foreground mt-2 flex justify-between font-mono text-xs">
								<span>{bytes(snap.memory.freeBytes)} livres</span>
								<span>{bytes(snap.memory.totalBytes)} capacidade total</span>
							</div>
						</div>
					</AcerolaCard>
				</section>

				<!-- Camada 3: Tabela VibePrompts Cost Explorer + Card de Inventário -->
				<section class="mt-4 grid grid-cols-1 items-stretch gap-4 lg:grid-cols-3">
					<!-- Tabela de Processos (2 colunas) -->
					<div class="flex h-full flex-col lg:col-span-2">
						<AcerolaProcessTable data={{ processes: snap.processes }} ui={{ class: 'h-full' }} />
					</div>

					<!-- Card de Inventário do Sistema (1 coluna) -->
					<div class="flex h-full flex-col">
						<AcerolaCard
							data={{ title: 'Inventário da Estação' }}
							ui={{ class: 'h-full p-4 sm:p-5' }}
						>
							<dl class="flex flex-1 flex-col justify-between gap-2 text-xs">
								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Hostname</dt>
									<dd class="text-foreground font-medium">{snap.host.hostname}</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">IP local</dt>
									<dd class="text-foreground font-mono">{snap.host.localIp || '—'}</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Endereço MAC</dt>
									<dd class="text-muted-foreground font-mono">{snap.host.macAddress || '—'}</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Sistema Operacional</dt>
									<dd
										class="text-foreground max-w-[150px] truncate text-right font-medium"
										title={snap.host.platform}
									>
										{snap.host.platform}
									</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Arquitetura</dt>
									<dd class="text-foreground font-mono">{snap.host.arch}</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Processador</dt>
									<dd
										class="text-foreground max-w-[160px] truncate text-right font-medium"
										title={snap.host.cpuModel}
									>
										{snap.host.cpuModel}
									</dd>
								</div>

								<div class="border-border/40 flex items-center justify-between border-b pb-1.5">
									<dt class="text-muted-foreground">Núcleos</dt>
									<dd class="text-foreground font-medium">
										{snap.host.logicalCpus} lógicos / {snap.host.physicalCpus} físicos
									</dd>
								</div>

								<div class="flex items-center justify-between">
									<dt class="text-muted-foreground">Memória instalada</dt>
									<dd class="text-foreground font-mono font-medium">
										{bytes(snap.host.totalMemoryBytes)}
									</dd>
								</div>
							</dl>
						</AcerolaCard>
					</div>
				</section>

				<!-- ABA 2: FILA & INSPETOR (APPROVALS QUEUE WITH DETAIL DRAWER) -->
			{:else if activeTab === 'queue'}
				<section class="h-full">
					<AcerolaProcessDrawer data={{ processes: snap.processes }} />
				</section>

				<!-- ABA 3: ARMAZENAMENTO & HARDWARE DETALHADO -->
			{:else if activeTab === 'system'}
				<section class="grid grid-cols-1 gap-4 md:grid-cols-2">
					<!-- Discos e Partições -->
					<AcerolaCard
						data={{ title: 'Volumes & Partições de Armazenamento' }}
						ui={{ class: 'p-5' }}
					>
						<div class="flex flex-col gap-4">
							{#each snap.disks as disk (disk.mountpoint)}
								<div class="border-border/70 bg-muted/20 rounded-xl border p-4">
									<div class="flex items-center justify-between">
										<div class="flex items-center gap-2">
											<HardDriveIcon size={16} class="text-primary" />
											<span class="text-foreground text-sm font-semibold">{disk.mountpoint}</span>
											<span
												class="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px]"
											>
												{disk.fstype}
											</span>
										</div>
										<span class="text-foreground font-mono text-xs font-semibold">
											{percent(disk.usedPercent)} ocupado
										</span>
									</div>

									<div class="mt-3">
										<AcerolaSegmentedBar
											data={{ percent: disk.usedPercent }}
											ui={{ colorVar: '--chart-3', segments: 24, height: 12 }}
										/>
									</div>

									<div class="text-muted-foreground mt-2.5 flex justify-between font-mono text-xs">
										<span>{bytes(disk.usedBytes)} ocupados</span>
										<span>{bytes(disk.freeBytes)} livres de {bytes(disk.totalBytes)}</span>
									</div>
								</div>
							{/each}
						</div>
					</AcerolaCard>

					<!-- Interfaces de Rede e I/O -->
					<div class="flex flex-col gap-4">
						<AcerolaCard data={{ title: 'Comunicação & Tráfego de Rede' }} ui={{ class: 'p-5' }}>
							<div class="mb-3 flex items-center justify-between">
								<span class="text-muted-foreground text-xs">Banda Instantânea</span>
								<div class="flex items-center gap-3 font-mono text-xs">
									<span class="text-primary">↓ {bytesPerSec(netTotals.recv)}</span>
									<span class="text-chart-2">↑ {bytesPerSec(netTotals.sent)}</span>
								</div>
							</div>

							<AcerolaSparkline
								data={{ timestamps, series: [netRecvValues, netSentValues] }}
								ui={{ colorVars: ['--chart-5', '--chart-2'], height: 110 }}
							/>

							<div class="border-border/60 mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-xs">
								<div class="border-border/60 bg-muted/20 rounded-lg border p-2.5">
									<span class="text-muted-foreground block text-[10px] tracking-wider uppercase"
										>IP Local (IPv4)</span
									>
									<span class="text-foreground mt-0.5 block font-mono text-xs font-semibold">
										{snap.host.localIp || '—'}
									</span>
								</div>
								<div class="border-border/60 bg-muted/20 rounded-lg border p-2.5">
									<span class="text-muted-foreground block text-[10px] tracking-wider uppercase"
										>Endereço Físico (MAC)</span
									>
									<span
										class="text-foreground mt-0.5 block truncate font-mono text-xs font-semibold"
										title={snap.host.macAddress}
									>
										{snap.host.macAddress || '—'}
									</span>
								</div>
							</div>
						</AcerolaCard>

						<!-- Informações do Agente e Conexão -->
						<AcerolaCard data={{ title: 'Status do Agente e Conexão' }} ui={{ class: 'p-5' }}>
							<div class="flex items-center gap-3">
								<div class="bg-primary/10 border-primary/20 text-primary rounded-xl border p-3">
									<ShieldCheckIcon size={24} />
								</div>
								<div>
									<h3 class="text-foreground text-sm font-semibold">Canal de Telemetria Ativo</h3>
									<p class="text-muted-foreground mt-0.5 text-xs">
										Comunicação via IPC nativo com Wails/Go a 1s de amostragem.
									</p>
								</div>
							</div>
						</AcerolaCard>
					</div>
				</section>
			{/if}
		</main>
	{:else}
		<div class="text-muted-foreground flex flex-1 items-center justify-center p-8 text-center">
			<ActivityIcon size={32} class="mb-2 animate-spin opacity-50" />
			<p class="text-sm">Coletando métricas do sistema operacional…</p>
		</div>
	{/if}
</div>
