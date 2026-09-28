<script module lang="ts">
	import { defineMeta } from '@storybook/addon-svelte-csf';
	import AcerolaReportingCard from './acerola-reporting-card.svelte';

	const { Story } = defineMeta({
		title: 'Components/AcerolaReportingCard',
		component: AcerolaReportingCard
	});
</script>

<Story
	name="Not Configured Yet"
	args={{ data: { serverUrl: '', hasToken: false, state: 'off' } }}
/>

<Story
	name="Connecting"
	args={{ data: { serverUrl: 'http://localhost:3005', hasToken: true, state: 'connecting' } }}
/>

<Story
	name="Connected"
	args={{ data: { serverUrl: 'http://painel.da.empresa', hasToken: true, state: 'connected' } }}
/>

<Story
	name="Key Refused"
	args={{ data: { serverUrl: 'http://painel.da.empresa', hasToken: true, state: 'rejected' } }}
/>

<Story
	name="Blocked By IT"
	args={{ data: { serverUrl: 'http://painel.da.empresa', hasToken: true, state: 'blocked' } }}
/>

<Story
	name="Saving"
	args={{
		data: { serverUrl: 'http://localhost:3005', hasToken: false, state: 'off' },
		state: { isSaving: true }
	}}
/>

<Story
	name="Save Refused"
	args={{
		data: { serverUrl: 'http://localhost:3005', hasToken: false, state: 'off' },
		state: { error: 'Cole a chave que o painel mostrou quando o computador foi cadastrado.' }
	}}
/>

<!-- Caso limite: endereço longo demais para a largura da popup. -->
<Story
	name="Very Long Address"
	args={{
		data: {
			serverUrl: 'https://painel-de-chamados-da-matriz.grupo-exemplo.com.br/agent',
			hasToken: true,
			state: 'connected'
		}
	}}
/>
