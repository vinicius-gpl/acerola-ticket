import { mount } from 'svelte';
import App from './app.svelte';
import './theme/tailwind.css';
import { Environment } from '../wailsjs/runtime/runtime';

// O CSS precisa saber em que sistema está rodando: no Linux é a página que
// arredonda os cantos da janela (ver tailwind.css, data-platform).
void Environment().then((environment) => {
	document.documentElement.dataset.platform = environment.platform;
});

const app = mount(App, {
	target: document.getElementById('app')!
});

export default app;
