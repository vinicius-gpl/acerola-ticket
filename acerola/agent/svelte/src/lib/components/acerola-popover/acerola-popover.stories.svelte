<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaPopover from './acerola-popover.svelte';
	import AcerolaButton from '../acerola-button/acerola-button.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaPopover',
		component: AcerolaPopover
	});
</script>

<Story name="Default">
	<AcerolaPopover
		data={{
			title: 'Sobre o Agente',
			description: 'Informações de telemetria e versão'
		}}
	>
		{#snippet children()}
			<AcerolaButton ui={{ variant: 'outline', size: 'sm' }}>Abrir Popover</AcerolaButton>
		{/snippet}
		{#snippet content()}
			<div class="space-y-1 p-2 text-xs">
				<p>Versão: 1.0.0</p>
				<p>Status: Operacional</p>
			</div>
		{/snippet}
	</AcerolaPopover>
</Story>

<Story name="Side Top">
	<AcerolaPopover data={{ title: 'Dica Superior' }} ui={{ side: 'top', align: 'center' }}>
		{#snippet children()}
			<AcerolaButton ui={{ variant: 'secondary', size: 'sm' }}>Abrir Acima</AcerolaButton>
		{/snippet}
		{#snippet content()}
			<p class="p-2 text-xs">Aberto acima do elemento disparador.</p>
		{/snippet}
	</AcerolaPopover>
</Story>

<Story name="Side Right">
	<AcerolaPopover data={{ title: 'Painel Lateral' }} ui={{ side: 'right', align: 'start' }}>
		{#snippet children()}
			<AcerolaButton ui={{ variant: 'ghost', size: 'sm' }}>Abrir à Direita</AcerolaButton>
		{/snippet}
		{#snippet content()}
			<p class="p-2 text-xs">Exibido alinhado ao lado direito.</p>
		{/snippet}
	</AcerolaPopover>
</Story>

<Story name="Content Only">
	<AcerolaPopover>
		{#snippet children()}
			<AcerolaButton ui={{ size: 'sm' }}>Sem Cabeçalho</AcerolaButton>
		{/snippet}
		{#snippet content()}
			<div class="p-3 text-xs">
				<p class="font-medium">Conteúdo direto</p>
				<p class="text-muted-foreground">Sem título nem descrição no cabeçalho.</p>
			</div>
		{/snippet}
	</AcerolaPopover>
</Story>

<Story name="Long Content (edge case)">
	<AcerolaPopover
		data={{
			title: 'Termos e Condições Extensos',
			description: 'Descrição longa para testar capacidade do container'
		}}
		ui={{ class: 'max-w-xs' }}
	>
		{#snippet children()}
			<AcerolaButton ui={{ variant: 'destructive', size: 'sm' }}>Conteúdo Longo</AcerolaButton>
		{/snippet}
		{#snippet content()}
			<div class="text-muted-foreground space-y-1 p-2 text-xs">
				<p>
					Texto detalhado de múltiplos parágrafos para validar scrolling ou quebra de linha interna.
				</p>
			</div>
		{/snippet}
	</AcerolaPopover>
</Story>
