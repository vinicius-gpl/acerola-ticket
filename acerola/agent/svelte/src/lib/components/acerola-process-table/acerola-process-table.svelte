<script module lang="ts">
	import type { ProcessStats } from '$lib/metrics/types';

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
	// Tabela de processos agrupados por aplicativo, no espírito do
	// Gerenciador de Tarefas: uma linha por executável com o total, que abre
	// pra mostrar cada processo. Sem o agrupamento a tabela mentia — ver
	// src-go/metrics/types.go.
	//
	// A ordenação e quais linhas estão abertas são estado de tela: nascem e
	// morrem aqui, não vêm do Go. O snapshot chega novo a cada segundo e
	// isso não pode reordenar nem fechar o que a pessoa abriu.
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

	// Os processos de dentro seguem a mesma coluna do grupo: se a pessoa
	// ordenou por memória, ela quer ver qual processo puxa a memória.
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

<div class={cn('max-h-64 overflow-auto', ui?.class)}>
	<table class="w-full text-xs tabular-nums">
		<thead>
			<tr class="text-muted-foreground border-border sticky top-0 border-b bg-inherit text-left">
				{#each columns as column (column.key)}
					<th
						class={cn('bg-card py-1 font-medium', column.numeric && 'text-right')}
						aria-sort={ariaSortFor(column.key)}
					>
						<button
							class="hover:text-foreground cursor-pointer transition-colors"
							onclick={() => toggleSort(column.key)}
						>
							{column.label}{sortColumn === column.key ? (sortDescending ? ' ↓' : ' ↑') : ''}
						</button>
					</th>
				{/each}
			</tr>
		</thead>

		<tbody>
			{#each sortedProcesses as group (group.name)}
				{@const isExpanded = expandedNames.includes(group.name)}

				<tr class="hover:bg-accent group">
					<td class="py-1">
						<button
							class="flex cursor-pointer items-center gap-1 font-medium"
							onclick={() => toggleExpanded(group.name)}
							aria-expanded={isExpanded}
						>
							<ChevronRightIcon
								size={12}
								class={cn('text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
							/>

							{group.name}

							<span class="text-muted-foreground font-normal">
								({group.instanceCount})
							</span>
						</button>
					</td>

					<td class="py-1 text-right">{group.cpuPercent.toFixed(1)}</td>
					<td class="py-1 text-right">{group.memPercent.toFixed(1)}</td>
					<td class="py-1 text-right">{bytes(group.memBytes)}</td>
				</tr>

				{#if isExpanded}
					{#each sortInstances(group) as instance (instance.pid)}
						<tr class="text-muted-foreground hover:bg-accent/50">
							<td class="py-0.5 pl-5 font-mono">PID {instance.pid}</td>
							<td class="py-0.5 text-right">{instance.cpuPercent.toFixed(1)}</td>
							<td class="py-0.5 text-right">{instance.memPercent.toFixed(1)}</td>
							<td class="py-0.5 text-right">{bytes(instance.memBytes)}</td>
						</tr>
					{/each}
				{/if}
			{/each}

			{#if sortedProcesses.length === 0}
				<tr>
					<td class="text-muted-foreground py-3 text-center" colspan="4">
						Nenhum processo para mostrar.
					</td>
				</tr>
			{/if}
		</tbody>
	</table>
</div>
