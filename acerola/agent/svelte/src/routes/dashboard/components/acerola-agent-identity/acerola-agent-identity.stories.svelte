<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaAgentIdentity from './acerola-agent-identity.svelte';

	const { Story } = defineMeta({
		title: 'Features/Dashboard/AcerolaAgentIdentity',
		component: AcerolaAgentIdentity
	});
</script>

<Story
	name="Live"
	args={{
		data: {
			isLive: true,
			subtitle: 'ESTACAO-EXEMPLO-01 · Microsoft Windows 11 Pro · online há 1d 2h'
		}
	}}
/>

<Story name="Connecting" args={{ data: { isLive: false } }} />

<Story
	name="Very Long Station Name (edge case)"
	args={{
		data: {
			isLive: true,
			subtitle:
				'ESTACAO-DE-TRABALHO-DO-SETOR-FINANCEIRO-SALA-204 · Microsoft Windows 11 Pro for Workstations · online há 128d 14h'
		}
	}}
/>
