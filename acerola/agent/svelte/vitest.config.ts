import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';
import { defineConfig } from 'vitest/config';

// Sem o projeto "storybook" do @storybook/addon-vitest de propósito: ele
// precisa de um Chromium real via Playwright, e o download trava por rede
// neste ambiente (ver .storybook/main.ts). Só o projeto jsdom comum roda.
export default defineConfig({
	plugins: [svelte()],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib')
		},
		// Sem isso, o Vite resolve o build server-side do Svelte (feito pra
		// SSR) em vez do client-side — e o client-side é o único que sabe
		// montar componente em DOM, mesmo rodando sob jsdom/Node.
		conditions: ['browser']
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.test.ts'],
		setupFiles: ['./src/test-setup.ts']
	}
});
