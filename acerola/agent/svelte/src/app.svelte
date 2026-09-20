<script lang="ts">
	import Router, { push } from 'svelte-spa-router';
	import { onDestroy, tick } from 'svelte';
	import Dashboard from './views/dashboard/dashboard.svelte';
	import Popup from './views/popup/popup.svelte';
	import { ViewReady } from '../wailsjs/go/main/App';
	import { EventsOn } from '../wailsjs/runtime/runtime';

	const routes = {
		'/popup': Popup,
		'/dashboard': Dashboard,
		'*': Popup
	};

	// O Go decide qual view mostrar (ver app.go, ShowPopup/ShowDashboard) e
	// avisa por evento; o frontend só troca de rota, não decide sozinho.
	//
	// O Go espera o ViewReady() abaixo antes de mostrar a janela de verdade
	// (ver awaitViewReady em app.go) — sem isso, a troca de rota podia não
	// ter sido pintada ainda quando a janela aparecesse, e o usuário via a
	// tela antiga (ou em branco) por um frame antes de "pular" pra tela
	// certa. `tick()` espera o Svelte terminar de aplicar a mudança de rota
	// ao DOM. Como em janelas escondidas o WebView2/Chromium pode suspender
	// requestAnimationFrame até a janela aparecer, combinamos com um timer
	// curto para avisar o Go rapidamente sem travar no timeout de 200ms.
	const unsubscribe = EventsOn('view:change', (view: 'popup' | 'dashboard') => {
		push(`/${view}`);
		tick().then(() => {
			let sent = false;
			const notify = () => {
				if (sent) return;
				sent = true;
				ViewReady();
			};
			requestAnimationFrame(notify);
			setTimeout(notify, 25);
		});
	});

	onDestroy(unsubscribe);
</script>

<div class="h-full w-full overflow-hidden">
	<Router {routes} />
</div>
