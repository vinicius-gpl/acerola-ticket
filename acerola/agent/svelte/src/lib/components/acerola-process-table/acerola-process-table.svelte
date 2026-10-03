<script module lang="ts">
	import type { ProcessStats } from '$lib/types/metrics.type';

	// Colunas por onde dá pra ordenar. "name" ordena alfabeticamente; as
	// outras, do maior consumo pro menor.
	export type ProcessSortColumn = 'name' | 'cpuPercent' | 'memPercent' | 'memBytes';

	export type AcerolaProcessTableProps = {
		data: {
			processes: ProcessStats[];
		};
		ui?: {
			class?: string;
		};
	};
</script>

<script lang="ts">
	// Tabela inspirada no modelo VibePrompts Cost Explorer:
	// - Cabeçalhos em caixa alta com tracking aberto e separação nítida
	// - Cabeçalho fixo separado do container de scroll (barra de rolagem restrita ao corpo da tabela)
	// - Barra de proporção (share bar) indicando a carga relativa do processo
	// - Destaque sutil para o principal consumidor
	// - Agrupamento expansível por aplicativo com detalhamento de PIDs
	// - Rodapé com metadados e contagem
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import { cn } from '$lib/utils/cn';
	import { bytes } from '$lib/utils/format';

	let { data, ui }: AcerolaProcessTableProps = $props();

	let sortColumn = $state<ProcessSortColumn>('cpuPercent');
	let sortDescending = $state(true);
	let expandedNames = $state<string[]>([]);

	const columns: { key: ProcessSortColumn; label: string; numeric: boolean }[] = [
		{ key: 'name', label: 'Aplicativo', numeric: false },
		{ key: 'cpuPercent', label: 'CPU %', numeric: true },
		{ key: 'memPercent', label: 'Mem %', numeric: true },
		{ key: 'memBytes', label: 'Memória', numeric: true }
	];

	const sortedProcesses = $derived(sortProcesses(data.processes, sortColumn, sortDescending));

	const maxMetricValue = $derived.by(() => {
		if (data.processes.length === 0) return 1;
		if (sortColumn === 'name') {
			return Math.max(...data.processes.map((p) => p.cpuPercent), 1);
		}
		const numericCol = sortColumn as 'cpuPercent' | 'memPercent' | 'memBytes';
		return Math.max(...data.processes.map((p) => Number(p[numericCol])), 1);
	});

	function calculateShare(process: ProcessStats): number {
		const val =
			sortColumn === 'name'
				? process.cpuPercent
				: Number(process[sortColumn as 'cpuPercent' | 'memPercent' | 'memBytes']);
		if (!val || maxMetricValue <= 0) return 0;
		return Math.min(100, Math.max(2, Math.round((val / maxMetricValue) * 100)));
	}

	function sortProcesses(
		processes: ProcessStats[],
		column: ProcessSortColumn,
		descending: boolean
	): ProcessStats[] {
		const direction = descending ? -1 : 1;
		return [...processes].sort((first, second) => {
			if (column === 'name') return direction * -first.name.localeCompare(second.name);
			return direction * (first[column] - second[column]);
		});
	}

	function sortInstances(group: ProcessStats) {
		const column = sortColumn === 'name' ? 'memBytes' : sortColumn;
		const direction = sortDescending ? -1 : 1;
		return [...group.instances].sort(
			(first, second) => direction * (first[column] - second[column])
		);
	}

	function toggleSort(column: ProcessSortColumn) {
		if (sortColumn === column) {
			sortDescending = !sortDescending;
			return;
		}
		sortColumn = column;
		sortDescending = true;
	}

	function toggleExpanded(name: string) {
		expandedNames = expandedNames.includes(name)
			? expandedNames.filter((expandedName) => expandedName !== name)
			: [...expandedNames, name];
	}

	function ariaSortFor(column: ProcessSortColumn): 'ascending' | 'descending' | 'none' {
		if (sortColumn !== column) return 'none';
		return sortDescending ? 'descending' : 'ascending';
	}
</script>

<div
	class={cn(
		'border-border/80 bg-card flex flex-col overflow-hidden rounded-2xl border shadow-xs',
		ui?.class
	)}
>
	<!-- Cabeçalho Fixo (Fora do container de rolagem, sem bordas vazando e sem scrollbar) -->
	<div class="border-border/70 bg-muted/40 text-muted-foreground shrink-0 border-b">
		<table class="w-full table-fixed text-xs tabular-nums">
			<colgroup>
				<col class="w-auto" />
				<col class="w-20" />
				<col class="w-20" />
				<col class="w-24" />
				<col class="hidden sm:table-column sm:w-28" />
			</colgroup>
			<thead>
				<tr class="text-left text-[11px] font-semibold tracking-widest uppercase">
					{#each columns as column (column.key)}
						<th
							class={cn(
								'px-4 py-2.5 font-semibold transition-colors',
								column.numeric && 'text-right'
							)}
							aria-sort={ariaSortFor(column.key)}
						>
							<button
								class="hover:text-foreground inline-flex cursor-pointer items-center gap-1 font-semibold transition-colors"
								onclick={() => toggleSort(column.key)}
							>
								<span>{column.label}</span>
								{#if sortColumn === column.key}
									<span class="text-primary font-mono text-[10px]">
										{sortDescending ? '↓' : '↑'}
									</span>
								{/if}
							</button>
						</th>
					{/each}
					<th class="hidden px-4 py-2.5 text-left font-semibold sm:table-cell"> Carga </th>
				</tr>
			</thead>
		</table>
	</div>

	<!-- Corpo da Tabela com Rolagem Dedicada (Scrollbar fica restrita apenas aos dados roláveis) -->
	<div class="max-h-72 flex-1 overflow-y-auto">
		<table class="w-full table-fixed text-xs tabular-nums">
			<colgroup>
				<col class="w-auto" />
				<col class="w-20" />
				<col class="w-20" />
				<col class="w-24" />
				<col class="hidden sm:table-column sm:w-28" />
			</colgroup>
			<tbody class="divide-border/40 divide-y">
				{#each sortedProcesses as group, index (group.name)}
					{@const isExpanded = expandedNames.includes(group.name)}
					{@const share = calculateShare(group)}

					<tr class={cn('hover:bg-muted/40 group transition-colors', index === 0 && 'bg-muted/15')}>
						<td class="px-4 py-2.5">
							<button
								class="text-foreground hover:text-primary flex cursor-pointer items-center gap-2 text-left font-medium transition-colors"
								onclick={() => toggleExpanded(group.name)}
								aria-expanded={isExpanded}
							>
								<ChevronRightIcon
									size={13}
									class={cn(
										'text-muted-foreground shrink-0 transition-transform duration-200',
										isExpanded && 'rotate-90'
									)}
								/>

								<span class="truncate font-medium">{group.name}</span>

								<span
									class="bg-muted py-0.2 text-muted-foreground rounded-full px-1.5 text-[10px] font-medium"
								>
									({group.instanceCount})
								</span>
							</button>
						</td>

						<td class="text-foreground px-4 py-2.5 text-right font-mono font-medium">
							{group.cpuPercent.toFixed(1)}%
						</td>
						<td class="text-muted-foreground px-4 py-2.5 text-right font-mono">
							{group.memPercent.toFixed(1)}%
						</td>
						<td class="text-foreground px-4 py-2.5 text-right font-mono font-medium">
							{bytes(group.memBytes)}
						</td>
						<td class="hidden px-4 py-2.5 sm:table-cell">
							<div class="flex items-center gap-2">
								<div class="bg-muted/80 h-1.5 w-16 overflow-hidden rounded-full md:w-20">
									<div
										class="bg-primary h-full rounded-full transition-all duration-300"
										style={`width: ${share}%`}
									></div>
								</div>
								<span class="text-muted-foreground w-6 text-right font-mono text-[10px]"
									>{share}%</span
								>
							</div>
						</td>
					</tr>

					{#if isExpanded}
						{#each sortInstances(group) as instance (instance.pid)}
							<tr class="bg-muted/20 text-muted-foreground hover:bg-muted/30 transition-colors">
								<td class="py-1.5 pr-4 pl-9 font-mono text-[11px]">
									PID {instance.pid}
								</td>
								<td class="px-4 py-1.5 text-right font-mono text-[11px]">
									{instance.cpuPercent.toFixed(1)}%
								</td>
								<td class="px-4 py-1.5 text-right font-mono text-[11px]">
									{instance.memPercent.toFixed(1)}%
								</td>
								<td class="px-4 py-1.5 text-right font-mono text-[11px]">
									{bytes(instance.memBytes)}
								</td>
								<td class="hidden px-4 py-1.5 sm:table-cell"></td>
							</tr>
						{/each}
					{/if}
				{/each}

				{#if sortedProcesses.length === 0}
					<tr>
						<td class="text-muted-foreground py-6 text-center text-xs" colspan="5">
							Nenhum processo para mostrar.
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Cost Explorer Footnote & Summary Bar -->
	<div
		class="border-border/70 bg-muted/20 text-muted-foreground flex shrink-0 flex-wrap items-center justify-between gap-3 border-t px-4 py-2.5 text-[11px]"
	>
		<span>Agrupamento por executável · Amostragem a cada 1s</span>
		<span class="text-foreground font-medium">{sortedProcesses.length} aplicativos ativos</span>
	</div>
</div>
