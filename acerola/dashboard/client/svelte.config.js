import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'dist',
      assets: 'dist',
      fallback: 'index.html',
      precompress: false,
      strict: true,
    }),
    /**
     * Caminho ABSOLUTO nos links de recurso (`/favicon.svg`), e não relativo.
     *
     * O SvelteKit 2 gera caminho relativo por padrão, para o app funcionar servido de uma
     * subpasta. Aqui ele é servido da raiz — o Nest responde `/` — e o relativo quebrava o
     * favicon: em `/tasks`, `./favicon.svg` vira `/tasks/favicon.svg`, que não existe.
     */
    paths: { relative: false },

    alias: {
      '@template/shared': '../shared/src',
      '@template/shared/*': '../shared/src/*',
      '@/*': './src/*',
    },
  },
};

export default config;
