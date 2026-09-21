import type { StorybookConfig } from '@storybook/svelte-vite';

// @storybook/addon-vitest (a integração que roda as stories como teste, via
// navegador real) ficou de fora: exige baixar um Chromium do Playwright, e
// esse download trava por rede neste ambiente (mesmo problema do bootstrap
// do WebView2 — ver docs/ARQUITETURA.md). O Storybook em si (`npm run
// storybook`, revisão visual) e os testes de componente comuns (jsdom, via
// `npm test`) não dependem disso.
const config: StorybookConfig = {
	stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
	addons: ['@storybook/addon-svelte-csf', '@storybook/addon-a11y', '@storybook/addon-docs'],
	framework: '@storybook/svelte-vite'
};
export default config;
