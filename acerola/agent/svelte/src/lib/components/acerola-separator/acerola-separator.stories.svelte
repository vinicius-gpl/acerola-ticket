<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaSeparator from './acerola-separator.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaSeparator',
		component: AcerolaSeparator
	});
</script>

<Story name="Horizontal">
	<div class="max-w-sm space-y-2 p-4">
		<p class="text-sm font-medium">Seção Superior</p>
		<AcerolaSeparator />
		<p class="text-muted-foreground text-xs">Seção Inferior</p>
	</div>
</Story>

<Story name="Vertical">
	<div class="flex h-6 items-center gap-3 p-4">
		<span class="text-sm">Início</span>
		<AcerolaSeparator ui={{ orientation: 'vertical' }} />
		<span class="text-sm">Meio</span>
		<AcerolaSeparator ui={{ orientation: 'vertical' }} />
		<span class="text-sm">Fim</span>
	</div>
</Story>

<Story name="Custom Styling (edge case)">
	<div class="max-w-sm space-y-2 p-4">
		<p class="text-sm">Separador com cor de destaque</p>
		<AcerolaSeparator ui={{ class: 'bg-primary/50' }} />
	</div>
</Story>
