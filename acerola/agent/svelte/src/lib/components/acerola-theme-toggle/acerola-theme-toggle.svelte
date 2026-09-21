<script lang="ts">
	import MoonIcon from '@lucide/svelte/icons/moon';
	import SunIcon from '@lucide/svelte/icons/sun';
	import AcerolaButton from '$lib/components/acerola-button/acerola-button.svelte';
	import { useTheme } from '$lib/theme/theme.svelte';

	const theme = useTheme();
</script>

<AcerolaButton
	events={{ onClick: theme.toggle }}
	ui={{ variant: 'ghost', size: 'icon', title: 'Alternar tema' }}
>
	{#if theme.value === 'catppuccin-mocha'}
		<MoonIcon size={16} />
	{:else}
		<SunIcon size={16} />
	{/if}
</AcerolaButton>
