<script module lang="ts">
	import type { ProcessStats } from '$lib/types/metrics.type';

	export type FilterTab = 'all' | 'high' | 'apps' | 'system';

	export type AcerolaProcessDrawerProps = {
		data: {
			processes: ProcessStats[];
		};
		ui?: {
			class?: string;
		};
	};
</script>

<script lang="ts">
	// Padrão VibePrompts: Approvals queue with detail drawer & expandable PID sheet
	// - Sem backdrop-blur interno para evitar vazamento em cantos arredondados no Webview2
	// - Cabeçalhos fixos externos ao container de rolagem (scrollbar apenas nas linhas roláveis)
	// - Seleção com bordas neutras e uniformes (sem border-l colorido)
	import CheckIcon from '@lucide/svelte/icons/check';
	import CopyIcon from '@lucide/svelte/icons/copy';
	import CpuIcon from '@lucide/svelte/icons/cpu';
	import SearchIcon from '@lucide/svelte/icons/search';
	import LayersIcon from '@lucide/svelte/icons/layers';
	import ActivityIcon from '@lucide/svelte/icons/activity';
	import Maximize2Icon from '@lucide/svelte/icons/maximize-2';
	import Minimize2Icon from '@lucide/svelte/icons/minimize-2';
	import { cubicIn, cubicOut } from 'svelte/easing';
	import { cn } from '$lib/utils/cn';
	import { bytes } from '$lib/utils/format';

	let { data, ui }: AcerolaProcessDrawerProps = $props();

	let searchQuery = $state('');
	let activeFilter = $state<FilterTab>('all');
	let selectedProcessName = $state<string | null>(null);
	let copied = $state(false);

	let isPidDrawerOpen = $state(false);
	let pidSearchQuery = $state('');

	/* ---- A gaveta de PIDs: arrastar pela língua e animar a entrada e a saída ----

	   Tudo aqui é estado puramente visual. `drawerOffset` é quanto a pessoa já puxou a gaveta
	   para baixo, em pixels; soltar depois do limite recolhe, soltar antes devolve ao lugar. */
	const DRAWER_CLOSE_THRESHOLD = 96;
	const DRAWER_CLICK_SLACK = 4;

	let drawerOffset = $state(0);
	let isDraggingDrawer = $state(false);
	let dragStartY = 0;
	let didDragDrawer = false;

	/* Quem pediu menos movimento ao sistema operacional não vê a gaveta deslizar: ela só
	   aparece e some. O mesmo vale onde o navegador não sabe animar (`animate` ausente). */
	function drawerDuration(ms: number): number {
		if (typeof Element === 'undefined' || typeof Element.prototype.animate !== 'function') return 0;
		if (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) return 0;

		return ms;
	}

	function drawerIn(node: HTMLElement) {
		const height = node.offsetHeight;

		return {
			duration: drawerDuration(280),
			easing: cubicOut,
			css: (t: number, u: number) =>
				`transform: translateY(${u * height}px); opacity: ${0.6 + 0.4 * t}`
		};
	}

	/* A saída parte de ONDE A GAVETA ESTÁ, e não do topo: quem a arrastou até a metade e soltou
	   a vê continuar descendo dali, sem voltar para cima antes de sumir. */
	function drawerOut(node: HTMLElement) {
		const height = node.offsetHeight;
		const from = drawerOffset;

		return {
			duration: drawerDuration(220),
			easing: cubicIn,
			css: (t: number, u: number) =>
				`transform: translateY(${from + u * (height - from)}px); opacity: ${0.6 + 0.4 * t}`
		};
	}

	function closePidDrawer() {
		isPidDrawerOpen = false;
	}

	function onDrawerDragStart(event: PointerEvent) {
		isDraggingDrawer = true;
		didDragDrawer = false;
		dragStartY = event.clientY;
		/* Captura o ponteiro: o arrasto continua valendo mesmo se o cursor sair de cima da língua. */
		(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
	}

	function onDrawerDragMove(event: PointerEvent) {
		if (!isDraggingDrawer) return;

		/* Só para baixo: puxar para cima não faz nada, a gaveta já está aberta inteira. */
		const moved = event.clientY - dragStartY;
		drawerOffset = Math.max(0, moved);
		if (Math.abs(moved) > DRAWER_CLICK_SLACK) didDragDrawer = true;
	}

	function onDrawerDragEnd() {
		if (!isDraggingDrawer) return;
		isDraggingDrawer = false;

		if (drawerOffset > DRAWER_CLOSE_THRESHOLD) {
			closePidDrawer();
			return;
		}

		drawerOffset = 0;
	}

	/* Clique (ou Enter/Espaço no teclado) na língua também recolhe. Um arrasto curto que voltou
	   ao lugar termina num `click` do navegador — esse não conta. */
	function onDrawerHandleClick() {
		if (didDragDrawer) {
			didDragDrawer = false;
			return;
		}

		closePidDrawer();
	}

	/* Toda vez que a gaveta abre, ela nasce no lugar — o deslocamento do último arrasto ficou
	   guardado só para a animação de saída partir dele. */
	$effect(() => {
		if (isPidDrawerOpen) drawerOffset = 0;
	});
	let pidCopied = $state<number | 'all' | null>(null);

	function isSystemProcess(name: string): boolean {
		const lower = name.toLowerCase();
		return (
			lower.includes('system') ||
			lower.includes('svchost') ||
			lower.includes('csrss') ||
			lower.includes('smss') ||
			lower.includes('wininit') ||
			lower.includes('services') ||
			lower.includes('lsass') ||
			lower.includes('registry')
		);
	}

	function getCategory(name: string): 'Sistema' | 'App' | 'Serviço' {
		if (isSystemProcess(name)) return 'Sistema';
		if (name.toLowerCase().endsWith('.exe')) return 'App';
		return 'Serviço';
	}

	function getMonogram(name: string): string {
		const clean = name.replace(/\.exe$/i, '').trim();
		if (!clean) return 'PR';
		const parts = clean.split(/[\s\-_]+/);
		if (parts.length >= 2) {
			return (parts[0][0] + parts[1][0]).toUpperCase();
		}
		return clean.slice(0, 2).toUpperCase();
	}

	const filteredProcesses = $derived.by(() => {
		let list = [...data.processes];

		if (activeFilter === 'high') {
			list = list.filter((p) => p.cpuPercent >= 2 || p.memBytes >= 200_000_000);
		} else if (activeFilter === 'system') {
			list = list.filter((p) => isSystemProcess(p.name));
		} else if (activeFilter === 'apps') {
			list = list.filter((p) => !isSystemProcess(p.name));
		}

		if (searchQuery.trim()) {
			const q = searchQuery.toLowerCase().trim();
			list = list.filter(
				(p) =>
					p.name.toLowerCase().includes(q) ||
					p.instances.some((inst) => String(inst.pid).includes(q))
			);
		}

		return list;
	});

	$effect(() => {
		if (filteredProcesses.length > 0) {
			if (!selectedProcessName || !filteredProcesses.some((p) => p.name === selectedProcessName)) {
				selectedProcessName = filteredProcesses[0].name;
			}
		} else {
			selectedProcessName = null;
		}
	});

	const selectedProcess = $derived(
		data.processes.find((p) => p.name === selectedProcessName) ?? filteredProcesses[0] ?? null
	);

	const filteredInstances = $derived.by(() => {
		if (!selectedProcess) return [];
		if (!pidSearchQuery.trim()) return selectedProcess.instances;
		const q = pidSearchQuery.toLowerCase().trim();
		return selectedProcess.instances.filter(
			(inst) =>
				String(inst.pid).includes(q) ||
				inst.cpuPercent.toFixed(1).includes(q) ||
				bytes(inst.memBytes).toLowerCase().includes(q)
		);
	});

	function select(proc: ProcessStats) {
		selectedProcessName = proc.name;
		pidSearchQuery = '';
	}

	async function copyDiagnostic() {
		if (!selectedProcess) return;
		const payload = JSON.stringify(
			{
				name: selectedProcess.name,
				instances: selectedProcess.instanceCount,
				cpuPercent: selectedProcess.cpuPercent,
				memPercent: selectedProcess.memPercent,
				memBytes: selectedProcess.memBytes,
				pids: selectedProcess.instances.map((i) => i.pid),
				timestamp: new Date().toISOString()
			},
			null,
			2
		);
		try {
			await navigator.clipboard.writeText(payload);
			copied = true;
			setTimeout(() => {
				copied = false;
			}, 2000);
		} catch (_) {}
	}

	async function copyAllPids() {
		if (!selectedProcess) return;
		const pids = selectedProcess.instances.map((i) => i.pid).join(', ');
		try {
			await navigator.clipboard.writeText(pids);
			pidCopied = 'all';
			setTimeout(() => {
				if (pidCopied === 'all') pidCopied = null;
			}, 2000);
		} catch (_) {}
	}

	async function copySinglePid(pid: number) {
		try {
			await navigator.clipboard.writeText(String(pid));
			pidCopied = pid;
			setTimeout(() => {
				if (pidCopied === pid) pidCopied = null;
			}, 1500);
		} catch (_) {}
	}
</script>

<svelte:window
	onkeydown={(e) => {
		if (e.key === 'Escape' && isPidDrawerOpen) {
			isPidDrawerOpen = false;
		}
	}}
/>

<div
	class={cn(
		'grid h-full min-h-[580px] gap-4 lg:h-[calc(100vh-140px)] lg:max-h-[760px] lg:grid-cols-[360px_1fr]',
		ui?.class
	)}
>
	<!-- Coluna Esquerda: Fila de Processos -->
	<div
		class="border-border/80 bg-card rounded-surface flex h-full flex-col overflow-hidden border shadow-xs"
	>
		<!-- Cabeçalho da Fila -->
		<div class="border-border/70 bg-card shrink-0 border-b p-4">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<LayersIcon size={16} class="text-primary" />
					<h2 class="text-foreground text-sm font-semibold tracking-tight">Fila de Processos</h2>
				</div>
				<span
					class="bg-primary/10 border-primary/20 text-primary rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums"
				>
					{filteredProcesses.length} ativos
				</span>
			</div>

			<!-- Chips de Filtro -->
			<div class="mt-3 flex flex-wrap gap-1.5">
				<button
					type="button"
					class={cn(
						'rounded-control cursor-pointer px-2.5 py-1 text-xs font-medium transition-all',
						activeFilter === 'all'
							? 'bg-foreground text-background font-semibold shadow-xs'
							: 'border-border/70 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground border'
					)}
					onclick={() => (activeFilter = 'all')}
				>
					Todos
				</button>
				<button
					type="button"
					class={cn(
						'rounded-control cursor-pointer px-2.5 py-1 text-xs font-medium transition-all',
						activeFilter === 'high'
							? 'bg-foreground text-background font-semibold shadow-xs'
							: 'border-border/70 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground border'
					)}
					onclick={() => (activeFilter = 'high')}
				>
					Alta Carga
				</button>
				<button
					type="button"
					class={cn(
						'rounded-control cursor-pointer px-2.5 py-1 text-xs font-medium transition-all',
						activeFilter === 'apps'
							? 'bg-foreground text-background font-semibold shadow-xs'
							: 'border-border/70 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground border'
					)}
					onclick={() => (activeFilter = 'apps')}
				>
					Aplicativos
				</button>
				<button
					type="button"
					class={cn(
						'rounded-control cursor-pointer px-2.5 py-1 text-xs font-medium transition-all',
						activeFilter === 'system'
							? 'bg-foreground text-background font-semibold shadow-xs'
							: 'border-border/70 bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground border'
					)}
					onclick={() => (activeFilter = 'system')}
				>
					Sistema
				</button>
			</div>

			<!-- Campo de Busca Rápida -->
			<div class="relative mt-3">
				<SearchIcon
					size={14}
					class="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
				/>
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="Buscar aplicativo ou PID..."
					class="border-border/70 bg-muted/30 focus:border-primary text-foreground placeholder:text-muted-foreground/60 rounded-control w-full border py-1.5 pr-3 pl-8 text-xs transition-colors outline-none"
				/>
			</div>
		</div>

		<!-- Lista de Processos em Cards Independentes -->
		<div class="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-2.5">
			{#each filteredProcesses as proc (proc.name)}
				{@const isSelected = selectedProcess?.name === proc.name}
				{@const category = getCategory(proc.name)}
				{@const monogram = getMonogram(proc.name)}

				<button
					type="button"
					onclick={() => select(proc)}
					class={cn(
						'group rounded-box relative flex w-full cursor-pointer items-center gap-3 p-2.5 text-left transition-all',
						isSelected
							? 'bg-muted/80 text-foreground border-border/80 ring-border/50 border shadow-xs ring-1'
							: 'text-muted-foreground hover:bg-muted/40 hover:text-foreground hover:border-border/40 border border-transparent'
					)}
				>
					<span
						class={cn(
							'rounded-chip grid h-9 w-9 shrink-0 place-items-center font-mono text-xs font-semibold transition-all',
							isSelected
								? 'bg-primary text-primary-foreground shadow-xs'
								: 'bg-muted/80 text-foreground/85 border-border/50 group-hover:border-border border'
						)}
					>
						{monogram}
					</span>

					<span class="min-w-0 flex-1">
						<span
							class={cn(
								'block truncate text-xs font-semibold',
								isSelected ? 'text-foreground' : 'text-foreground/90'
							)}
						>
							{proc.name}
						</span>
						<span class="text-muted-foreground mt-0.5 block truncate font-mono text-xs">
							{proc.cpuPercent.toFixed(1)}% CPU · {bytes(proc.memBytes)}
						</span>
					</span>

					<span
						class={cn(
							'shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium',
							category === 'Sistema'
								? 'border-warning/25 bg-warning/10 text-warning'
								: 'border-border/50 bg-muted/60 text-muted-foreground'
						)}
					>
						{category}
					</span>
				</button>
			{/each}

			{#if filteredProcesses.length === 0}
				<div class="text-muted-foreground p-8 text-center text-xs">
					Nenhum processo encontrado para este filtro.
				</div>
			{/if}
		</div>
	</div>

	<!-- Coluna Direita: Detail Drawer -->
	<div
		class="border-border/80 bg-card rounded-surface relative flex h-full flex-col overflow-hidden border shadow-xs"
	>
		{#if selectedProcess}
			{@const category = getCategory(selectedProcess.name)}

			<!-- Decorator Fixo do Processo (Sem backdrop-blur para evitar artefato nos cantos) -->
			<div
				class="border-border/70 bg-card flex shrink-0 flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5"
			>
				<div>
					<div class="flex items-center gap-2">
						<h2 class="text-foreground text-lg font-semibold tracking-tight sm:text-xl">
							{selectedProcess.name}
						</h2>
						<span
							class="border-success/20 bg-success/10 text-success rounded-full border px-2.5 py-0.5 text-xs font-medium"
						>
							Ativo · Em execução
						</span>
					</div>
					<p class="text-muted-foreground mt-1 text-xs">
						Agrupamento com {selectedProcess.instanceCount}
						{selectedProcess.instanceCount === 1 ? 'processo filho' : 'processos filhos'}
					</p>
				</div>

				<div class="flex items-center gap-2">
					<span
						class="bg-muted text-foreground rounded-full px-3 py-1 font-mono text-xs font-medium"
					>
						{category}
					</span>

					<button
						type="button"
						onclick={() => (isPidDrawerOpen = !isPidDrawerOpen)}
						class={cn(
							'rounded-control inline-flex cursor-pointer items-center gap-1.5 border px-3 py-1.5 text-xs font-medium shadow-xs transition-all',
							isPidDrawerOpen
								? 'bg-foreground text-background border-foreground shadow-xs'
								: 'border-border/70 bg-muted/40 text-foreground hover:bg-muted'
						)}
						title={isPidDrawerOpen
							? 'Recolher gaveta de PIDs'
							: 'Expandir gaveta de PIDs em tela cheia'}
					>
						{#if isPidDrawerOpen}
							<Minimize2Icon size={13} />
							<span>Recolher PIDs</span>
						{:else}
							<Maximize2Icon size={13} />
							<span>Expandir PIDs</span>
						{/if}
					</button>
				</div>
			</div>

			<!-- Conteúdo Principal com Rolagem Interna -->
			<div class="min-h-0 flex-1 space-y-6 overflow-y-auto p-5 sm:p-6">
				<!-- Grid de Definição (<dl>) com 6 Campos Técnicos -->
				<dl class="grid gap-4 sm:grid-cols-2">
					<div class="border-border/60 bg-muted/20 rounded-box border p-3">
						<dt class="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
							Consumo Agregado de CPU
						</dt>
						<dd class="text-foreground mt-1 font-mono text-base font-semibold">
							{selectedProcess.cpuPercent.toFixed(1)}%
						</dd>
					</div>

					<div class="border-border/60 bg-muted/20 rounded-box border p-3">
						<dt class="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
							Memória RAM Alocada
						</dt>
						<dd class="text-foreground mt-1 font-mono text-base font-semibold">
							{bytes(selectedProcess.memBytes)}
							<span class="text-muted-foreground text-xs font-normal">
								({selectedProcess.memPercent.toFixed(1)}% do sistema)
							</span>
						</dd>
					</div>

					<div class="border-border/60 bg-muted/20 rounded-box border p-3">
						<dt class="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
							Instâncias Ativas
						</dt>
						<dd class="text-foreground mt-1 text-sm font-semibold">
							{selectedProcess.instanceCount}
							{selectedProcess.instanceCount === 1 ? 'instância' : 'instâncias'}
						</dd>
					</div>

					<div class="border-border/60 bg-muted/20 rounded-box border p-3">
						<dt class="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
							PIDs Vinculados
						</dt>
						<dd
							class="text-foreground mt-1 truncate font-mono text-xs font-semibold"
							title={selectedProcess.instances.map((i) => i.pid).join(', ')}
						>
							{selectedProcess.instances.map((i) => i.pid).join(', ')}
						</dd>
					</div>

					<div class="border-border/60 bg-muted/20 rounded-box border p-3">
						<dt class="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
							Memória Média / Instância
						</dt>
						<dd class="text-foreground mt-1 font-mono text-sm font-semibold">
							{bytes(
								Math.round(selectedProcess.memBytes / Math.max(selectedProcess.instanceCount, 1))
							)}
						</dd>
					</div>

					<div class="border-border/60 bg-muted/20 rounded-box border p-3">
						<dt class="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
							Prioridade de Execução
						</dt>
						<dd class="text-foreground mt-1 text-sm font-semibold">Normal (Agendador do SO)</dd>
					</div>
				</dl>

				<!-- Bloco de Diagnóstico -->
				<div>
					<p class="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
						Diagnóstico do Agente
					</p>
					<blockquote
						class="border-border/70 bg-muted/30 text-muted-foreground rounded-box mt-2 border p-4 text-xs leading-relaxed"
					>
						{#if selectedProcess.cpuPercent > 15}
							O aplicativo <strong class="text-foreground font-semibold"
								>{selectedProcess.name}</strong
							>
							está apresentando consumo elevado de ciclos de processamento ({selectedProcess.cpuPercent.toFixed(
								1
							)}%). Recomendado monitorar se o consumo persiste após a conclusão das tarefas em
							primeiro plano.
						{:else if selectedProcess.memBytes > 1_500_000_000}
							O aplicativo <strong class="text-foreground font-semibold"
								>{selectedProcess.name}</strong
							>
							possui ocupação expressiva de memória RAM ({bytes(selectedProcess.memBytes)}). O
							coletor de memória e o subsistema de paginação estão operando em condições estáveis.
						{:else}
							O processo <strong class="text-foreground font-semibold"
								>{selectedProcess.name}</strong
							> está operando em conformidade dentro da faixa nominal de recursos do sistema. Nenhuma
							anomalia de latência ou retenção excessiva detectada.
						{/if}
					</blockquote>
				</div>

				<!-- Tabela Compacta de Instâncias / Threads (PIDs) -->
				<div>
					<div class="mb-2.5 flex items-center justify-between">
						<p class="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
							Detalhamento por PID ({selectedProcess.instances.length})
						</p>

						<button
							type="button"
							onclick={() => (isPidDrawerOpen = true)}
							class="text-primary hover:text-primary/90 bg-primary/10 hover:bg-primary/20 border-primary/20 rounded-control inline-flex cursor-pointer items-center gap-1.5 border px-2.5 py-1 text-xs font-medium shadow-xs transition-all"
						>
							<Maximize2Icon size={12} />
							<span>Expandir Gaveta ({selectedProcess.instances.length})</span>
						</button>
					</div>

					<div class="border-border/60 rounded-box overflow-hidden border">
						<!-- Header fixo fora do scroll -->
						<div class="border-border/60 bg-muted/40 text-muted-foreground shrink-0 border-b">
							<table class="w-full table-fixed text-xs tabular-nums">
								<colgroup>
									<col class="w-auto" />
									<col class="w-20" />
									<col class="w-20" />
									<col class="w-24" />
								</colgroup>
								<thead>
									<tr class="text-left text-xs font-semibold uppercase">
										<th class="px-3 py-2">PID</th>
										<th class="px-3 py-2 text-right">CPU</th>
										<th class="px-3 py-2 text-right">Mem %</th>
										<th class="px-3 py-2 text-right">Memória</th>
									</tr>
								</thead>
							</table>
						</div>

						<!-- Corpo com scroll dedicado (scrollbar não sobe no header) -->
						<div class="max-h-48 overflow-y-auto">
							<table class="w-full table-fixed text-xs tabular-nums">
								<colgroup>
									<col class="w-auto" />
									<col class="w-20" />
									<col class="w-20" />
									<col class="w-24" />
								</colgroup>
								<tbody class="divide-border/40 divide-y">
									{#each selectedProcess.instances as instance (instance.pid)}
										<tr class="hover:bg-muted/30 transition-colors">
											<td class="text-foreground px-3 py-2 font-mono font-medium">
												PID {instance.pid}
											</td>
											<td class="text-muted-foreground px-3 py-2 text-right font-mono">
												{instance.cpuPercent.toFixed(1)}%
											</td>
											<td class="text-muted-foreground px-3 py-2 text-right font-mono">
												{instance.memPercent.toFixed(1)}%
											</td>
											<td class="text-foreground px-3 py-2 text-right font-mono font-medium">
												{bytes(instance.memBytes)}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>

						{#if selectedProcess.instances.length > 3}
							<button
								type="button"
								onclick={() => (isPidDrawerOpen = true)}
								class="border-border/40 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground flex w-full cursor-pointer items-center justify-center gap-1.5 border-t py-2 text-center text-xs font-medium transition-colors"
							>
								<Maximize2Icon size={12} />
								<span>Ver todas as {selectedProcess.instances.length} instâncias em tela cheia</span
								>
							</button>
						{/if}
					</div>
				</div>
			</div>

			<!-- Rodapé Fixo de Ações do Drawer -->
			<div
				class="border-border/70 bg-muted/20 flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-6 py-3.5"
			>
				<span class="text-muted-foreground text-xs">Última amostragem: Agora</span>

				<div class="flex items-center gap-2">
					<button
						type="button"
						onclick={copyDiagnostic}
						class="border-border/70 bg-card text-foreground hover:bg-muted rounded-control inline-flex cursor-pointer items-center gap-1.5 border px-3.5 py-2 text-xs font-medium shadow-xs transition-all"
					>
						{#if copied}
							<CheckIcon size={14} class="text-success" />
							<span>Copiado!</span>
						{:else}
							<CopyIcon size={14} />
							<span>Copiar Diagnóstico</span>
						{/if}
					</button>

					<button
						type="button"
						class="bg-primary text-primary-foreground rounded-control inline-flex cursor-pointer items-center gap-1.5 px-4 py-2 text-xs font-medium shadow-xs transition-all hover:opacity-90"
					>
						<ActivityIcon size={14} />
						<span>Monitorar Processo</span>
					</button>
				</div>
			</div>

			<!-- GAVETA DE PIDS EM TELA CHEIA (BOTTOM-UP DRAWER) -->
			<!-- Desliza de baixo para cima cobrindo o conteúdo de métricas e mantendo o decorator no topo -->
			{#if isPidDrawerOpen}
				<div
					in:drawerIn
					out:drawerOut
					style:transform={drawerOffset > 0 ? `translateY(${drawerOffset}px)` : undefined}
					class={cn(
						'bg-card border-border absolute inset-x-0 top-[73px] bottom-0 z-20 flex flex-col border-t shadow-xl',
						/* Soltou antes do limite: volta ao lugar deslizando. Durante o arrasto não há
						   transição — a gaveta tem de acompanhar o dedo sem atraso. */
						!isDraggingDrawer && 'transition-transform duration-200 ease-out'
					)}
				>
					<!-- Puxador Superior & Cabeçalho da Gaveta -->
					<div class="border-border/60 bg-card shrink-0 border-b px-5 pb-3">
						<!-- A língua. A área de pegar é a faixa inteira, bem maior que o traço que se vê:
						     4px de altura não é alvo para mouse nem para dedo. `touch-none` impede a
						     janela de rolar enquanto a pessoa arrasta. -->
						<button
							type="button"
							aria-label="Recolher gaveta — arraste para baixo ou clique"
							title="Arraste para baixo para recolher"
							class={cn(
								'group flex w-full touch-none justify-center pt-3 pb-3 outline-none',
								isDraggingDrawer ? 'cursor-grabbing' : 'cursor-grab'
							)}
							onpointerdown={onDrawerDragStart}
							onpointermove={onDrawerDragMove}
							onpointerup={onDrawerDragEnd}
							onpointercancel={onDrawerDragEnd}
							onclick={onDrawerHandleClick}
						>
							<span
								class={cn(
									'h-1 w-10 rounded-full transition-colors',
									isDraggingDrawer
										? 'bg-muted-foreground/70'
										: 'bg-muted-foreground/30 group-hover:bg-muted-foreground/60 group-focus-visible:bg-primary'
								)}
							></span>
						</button>

						<div class="flex flex-wrap items-center justify-between gap-3">
							<div class="flex items-center gap-2.5">
								<span
									class="bg-primary/10 border-primary/20 text-primary rounded-chip grid h-7 w-7 place-items-center border font-mono text-xs font-bold"
								>
									{filteredInstances.length}
								</span>
								<div>
									<h3 class="text-foreground text-sm font-semibold tracking-tight">
										Instâncias e Threads de {selectedProcess.name}
									</h3>
									<p class="text-muted-foreground text-xs">
										Detalhamento em tempo real de cada PID isolado
									</p>
								</div>
							</div>

							<div class="flex items-center gap-2">
								<div class="relative">
									<SearchIcon
										size={13}
										class="text-muted-foreground absolute top-1/2 left-2.5 -translate-y-1/2"
									/>
									<input
										type="text"
										bind:value={pidSearchQuery}
										placeholder="Filtrar PID..."
										class="border-border/70 bg-muted/30 focus:border-primary text-foreground placeholder:text-muted-foreground/60 rounded-control w-36 border py-1 pr-2.5 pl-7 text-xs transition-colors outline-none sm:w-44"
									/>
								</div>

								<button
									type="button"
									onclick={copyAllPids}
									class="border-border/70 bg-card hover:bg-muted text-foreground rounded-control inline-flex cursor-pointer items-center gap-1.5 border px-2.5 py-1 text-xs font-medium shadow-xs transition-all"
									title="Copiar todos os números de PID"
								>
									{#if pidCopied === 'all'}
										<CheckIcon size={13} class="text-success" />
										<span class="text-success">Copiados!</span>
									{:else}
										<CopyIcon size={13} />
										<span class="hidden sm:inline">Copiar PIDs</span>
									{/if}
								</button>

								<button
									type="button"
									onclick={closePidDrawer}
									class="border-border/70 bg-card hover:bg-muted text-muted-foreground hover:text-foreground rounded-control inline-flex cursor-pointer items-center gap-1.5 border px-2.5 py-1 text-xs font-medium shadow-xs transition-all"
									title="Recolher gaveta"
								>
									<Minimize2Icon size={13} />
									<span>Recolher</span>
								</button>
							</div>
						</div>
					</div>

					<!-- Tabela Completa com Scroll Interno -->
					<div class="flex min-h-0 flex-1 flex-col p-4 sm:p-5">
						<div
							class="border-border/70 bg-card rounded-box flex min-h-0 flex-1 flex-col overflow-hidden border"
						>
							<div class="border-border/70 bg-muted/40 text-muted-foreground shrink-0 border-b">
								<table class="w-full table-fixed text-xs tabular-nums">
									<colgroup>
										<col class="w-auto" />
										<col class="w-32" />
										<col class="w-32" />
										<col class="w-32" />
										<col class="w-28" />
									</colgroup>
									<thead>
										<tr class="text-left text-xs font-semibold uppercase">
											<th class="px-4 py-2.5">PID</th>
											<th class="px-4 py-2.5 text-right">CPU (%)</th>
											<th class="px-4 py-2.5 text-right">Memória (%)</th>
											<th class="px-4 py-2.5 text-right">Consumo RAM</th>
											<th class="px-2 py-2.5 text-center">Ação</th>
										</tr>
									</thead>
								</table>
							</div>

							<div class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
								<table class="w-full table-fixed text-xs tabular-nums">
									<colgroup>
										<col class="w-auto" />
										<col class="w-32" />
										<col class="w-32" />
										<col class="w-32" />
										<col class="w-28" />
									</colgroup>
									<tbody class="divide-border/40 divide-y">
										{#each filteredInstances as instance (instance.pid)}
											<tr class="hover:bg-muted/30 transition-colors">
												<td class="text-foreground px-4 py-2.5 font-mono font-semibold">
													<span
														class="bg-muted/80 text-foreground border-border/50 rounded-chip border px-1.5 py-0.5 font-mono text-xs"
													>
														PID {instance.pid}
													</span>
												</td>
												<td
													class="text-muted-foreground px-4 py-2.5 text-right font-mono font-medium"
												>
													<div class="flex items-center justify-end gap-2">
														<span>{instance.cpuPercent.toFixed(1)}%</span>
														<div class="bg-muted h-1.5 w-12 overflow-hidden rounded-full">
															<div
																class="bg-primary h-full rounded-full transition-all"
																style={`width: ${Math.min(instance.cpuPercent * 5, 100)}%`}
															></div>
														</div>
													</div>
												</td>
												<td
													class="text-muted-foreground px-4 py-2.5 text-right font-mono font-medium"
												>
													{instance.memPercent.toFixed(1)}%
												</td>
												<td class="text-foreground px-4 py-2.5 text-right font-mono font-semibold">
													{bytes(instance.memBytes)}
												</td>
												<td class="px-2 py-2.5 text-center">
													<button
														type="button"
														onclick={() => copySinglePid(instance.pid)}
														class="border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground rounded-control inline-flex cursor-pointer items-center gap-1 border px-2 py-1 text-xs transition-all"
														title={`Copiar PID ${instance.pid}`}
													>
														{#if pidCopied === instance.pid}
															<CheckIcon size={12} class="text-success" />
															<span class="text-success text-xs">Copiado</span>
														{:else}
															<CopyIcon size={12} />
															<span class="text-xs">Copiar</span>
														{/if}
													</button>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>

								{#if filteredInstances.length === 0}
									<div class="text-muted-foreground p-8 text-center text-xs">
										Nenhum PID encontrado para o filtro "{pidSearchQuery}".
									</div>
								{/if}
							</div>
						</div>
					</div>

					<!-- Rodapé da Gaveta Expandida -->
					<div
						class="border-border/70 bg-muted/30 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs"
					>
						<div class="text-muted-foreground flex items-center gap-3 font-mono text-xs">
							<span>
								Total: <strong class="text-foreground">{selectedProcess.instances.length}</strong>
								PIDs
							</span>
							<span>·</span>
							<span>
								Agregado CPU: <strong class="text-foreground"
									>{selectedProcess.cpuPercent.toFixed(1)}%</strong
								>
							</span>
							<span>·</span>
							<span>
								Agregado RAM: <strong class="text-foreground"
									>{bytes(selectedProcess.memBytes)}</strong
								>
							</span>
						</div>

						<button
							type="button"
							onclick={closePidDrawer}
							class="bg-foreground text-background rounded-control inline-flex cursor-pointer items-center gap-1.5 px-4 py-1.5 text-xs font-semibold shadow-xs transition-all hover:opacity-90"
						>
							<span>Fechar Gaveta</span>
						</button>
					</div>
				</div>
			{/if}
		{:else}
			<div
				class="text-muted-foreground flex flex-1 flex-col items-center justify-center p-12 text-center"
			>
				<LayersIcon size={36} class="mb-3 opacity-40" />
				<p class="text-sm font-medium">Selecione um processo na lista ao lado</p>
				<p class="text-muted-foreground/80 mt-1 text-xs">
					Visualize métricas aprofundadas de CPU, memória, instâncias e telemetria.
				</p>
			</div>
		{/if}
	</div>
</div>
