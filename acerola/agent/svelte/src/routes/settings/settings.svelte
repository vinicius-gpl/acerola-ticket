<script lang="ts">
	import { onMount } from 'svelte';
	import ArrowLeftIcon from '@lucide/svelte/icons/arrow-left';
	import XIcon from '@lucide/svelte/icons/x';

	import AcerolaButton from '$lib/components/acerola-button/acerola-button.svelte';
	import AcerolaReportingCard from '$lib/components/acerola-reporting-card/acerola-reporting-card.svelte';
	import { useReporting } from '$lib/hooks/use-reporting/use-reporting.svelte';
	import { HideWindow, ShowDashboard } from '../../../wailsjs/go/main/App';

	/**
	 * A CONFIGURAÇÃO do agente, sozinha numa tela.
	 *
	 * Ligar esta máquina ao painel do TI é tarefa de instalação, feita uma vez. Ela não divide
	 * espaço com os gráficos: quem abre o Dashboard quer ver desempenho, e quem abre isto aqui
	 * está com uma chave na mão.
	 */
	const reporting = useReporting();

	/* A conexão muda sozinha (o painel caiu, a rede voltou, o TI desbloqueou), e só quem
	   pergunta descobre — o Go não empurra evento para esta tela. */
	onMount(() => reporting.watch());
</script>

<div class="bg-background rounded-surface flex h-full w-full flex-col overflow-hidden">
	<header class="border-border/70 flex items-center justify-between gap-2 border-b px-3 py-2.5">
		<div class="flex min-w-0 items-center gap-2">
			<AcerolaButton
				ui={{ variant: 'ghost', size: 'icon', title: 'Voltar ao Dashboard' }}
				events={{ onClick: () => void ShowDashboard() }}
			>
				<ArrowLeftIcon size={16} />
			</AcerolaButton>

			<div class="min-w-0">
				<h1 class="text-foreground truncate text-sm font-semibold tracking-tight">
					Configuração do agente
				</h1>
				<p class="text-muted-foreground text-xs">Liga esta máquina ao painel do TI.</p>
			</div>
		</div>

		<AcerolaButton
			ui={{ variant: 'ghost', size: 'icon', title: 'Fechar' }}
			events={{ onClick: () => void HideWindow() }}
		>
			<XIcon size={16} />
		</AcerolaButton>
	</header>

	<main class="min-h-0 flex-1 overflow-auto p-3">
		<AcerolaReportingCard
			data={reporting.card}
			state={reporting.state}
			events={{ onSave: reporting.save }}
		/>
	</main>
</div>
