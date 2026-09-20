<script lang="ts">
	import Router, { push } from 'svelte-spa-router';
	import { onDestroy } from 'svelte';
	import Dashboard from './views/dashboard/dashboard.svelte';
	import Popup from './views/popup/popup.svelte';
	import { EventsOn } from '../wailsjs/runtime/runtime';

	const routes = {
		'/popup': Popup,
		'/dashboard': Dashboard,
		'*': Popup
	};

	// O Go decide qual view mostrar (ver app.go, ShowPopup/ShowDashboard) e
	// avisa por evento; o frontend só troca de rota, não decide sozinho.
	const unsubscribe = EventsOn('view:change', (view: 'popup' | 'dashboard') => {
		push(`/${view}`);
	});

	onDestroy(unsubscribe);
</script>

<div class="h-screen w-screen">
	<Router {routes} />
</div>
