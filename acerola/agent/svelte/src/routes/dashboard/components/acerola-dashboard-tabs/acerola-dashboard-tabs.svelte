<script module lang="ts">
	// As abas do painel, no centro do cabeçalho. Existe como componente porque a rota só compõe:
	// botão cru com estado de "ativo" é desenho de componente, não de tela. Quem guarda a aba
	// ativa continua sendo a tela; aqui só se mostra qual é e se avisa quando a pessoa troca.
	export type DashboardTab = 'overview' | 'queue' | 'system';

	export type AcerolaDashboardTabsProps = {
		data: {
			activeTab: DashboardTab;
			/** Quantos aplicativos há na fila; sem o número, a aba não mostra o contador. */
			queueCount?: number;
		};
		events?: { onChange?: (tab: DashboardTab) => void };
		ui?: { class?: string };
	};
</script>

<script lang="ts">
	import HardDriveIcon from '@lucide/svelte/icons/hard-drive';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import LayoutPanelLeftIcon from '@lucide/svelte/icons/layout-panel-left';
	import { cn } from '$lib/utils/cn';

	let { data, events, ui }: AcerolaDashboardTabsProps = $props();

	const tabClass = (tab: DashboardTab) =>
		cn(
			'rounded-chip flex cursor-pointer items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all',
			data.activeTab === tab
				? 'bg-card text-foreground font-semibold shadow-xs'
				: 'text-muted-foreground hover:text-foreground'
		);
</script>

<nav
	class={cn(
		'border-border/70 bg-muted/30 rounded-control hidden items-center gap-1 border p-1 md:flex',
		ui?.class
	)}
>
	<button
		type="button"
		class={tabClass('overview')}
		aria-pressed={data.activeTab === 'overview'}
		onclick={() => events?.onChange?.('overview')}
	>
		<LayoutDashboardIcon size={14} />
		<span>Visão Geral</span>
	</button>

	<button
		type="button"
		class={tabClass('queue')}
		aria-pressed={data.activeTab === 'queue'}
		onclick={() => events?.onChange?.('queue')}
	>
		<LayoutPanelLeftIcon size={14} />
		<span>Fila & Detalhes</span>
		{#if data.queueCount !== undefined}
			<span
				class="bg-primary/10 border-primary/20 py-0.2 text-primary rounded-full border px-1.5 text-xs font-semibold"
			>
				{data.queueCount}
			</span>
		{/if}
	</button>

	<button
		type="button"
		class={tabClass('system')}
		aria-pressed={data.activeTab === 'system'}
		onclick={() => events?.onChange?.('system')}
	>
		<HardDriveIcon size={14} />
		<span>Armazenamento & SO</span>
	</button>
</nav>
