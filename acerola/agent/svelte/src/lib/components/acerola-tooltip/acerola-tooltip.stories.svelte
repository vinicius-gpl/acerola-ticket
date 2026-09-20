<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaTooltip from './acerola-tooltip.svelte';
	import AcerolaButton from '../acerola-button/acerola-button.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaTooltip',
		component: AcerolaTooltip
	});
</script>

<Story name="Default">
	<AcerolaTooltip data={{ text: 'Informações rápidas ao passar o mouse' }}>
		<AcerolaButton ui={{ variant: 'ghost', size: 'sm' }}>Passe o mouse</AcerolaButton>
	</AcerolaTooltip>
</Story>

<Story name="Bottom Position">
	<AcerolaTooltip data={{ text: 'Exibido abaixo do elemento' }} ui={{ side: 'bottom' }}>
		<AcerolaButton ui={{ variant: 'outline', size: 'sm' }}>Posição Inferior</AcerolaButton>
	</AcerolaTooltip>
</Story>

<Story name="Rich Content">
	<AcerolaTooltip>
		<AcerolaButton ui={{ variant: 'secondary', size: 'sm' }}>Conteúdo Rico</AcerolaButton>
		{#snippet content()}
			<div class="p-1 text-xs">
				<p class="font-bold">Dica Detalhada</p>
				<p class="text-muted-foreground">Suporte a múltiplos elementos HTML internos.</p>
			</div>
		{/snippet}
	</AcerolaTooltip>
</Story>

<Story name="Long Text (edge case)">
	<AcerolaTooltip
		data={{
			text: 'Texto de ajuda muito longo para validar como o tooltip se comporta com largura máxima e quebra de linha em telas compactas.'
		}}
	>
		<AcerolaButton ui={{ size: 'sm' }}>Texto Longo</AcerolaButton>
	</AcerolaTooltip>
</Story>

<Story name="Empty Text (edge case)">
	<AcerolaTooltip data={{ text: '' }}>
		<AcerolaButton ui={{ variant: 'outline', size: 'sm' }}>Sem Texto</AcerolaButton>
	</AcerolaTooltip>
</Story>
