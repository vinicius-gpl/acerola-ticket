import { fileURLToPath } from 'node:url';

import { svelte } from '@sveltejs/vite-plugin-svelte';
import { svelteTesting } from '@testing-library/svelte/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    conditions: ['browser'],
    alias: {
      'lucide-svelte': '@lucide/svelte',
      '@template/shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      $lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
      $app: fileURLToPath(new URL('./tests/app-mock', import.meta.url)),
    },
  },
  test: {
    name: 'client',
    include: ['src/**/*.test.{ts,js}'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    /* `@lucide/svelte`, `bits-ui` e as libs que ele usa por baixo (`runed`, `svelte-toolbelt`)
       distribuem `.svelte`/`.svelte.js` cru, para o bundler do consumidor compilar. Sem isto,
       o Vitest trata o pacote como externo: além do erro de extensão desconhecida, uma
       dependência externa carrega uma cópia separada do runtime do Svelte, e `setContext`
       chamado por ela não enxerga o componente sendo montado pelo Vite. */
    server: {
      deps: {
        inline: [/@lucide\/svelte/, /bits-ui/, /runed/, /svelte-toolbelt/],
      },
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,svelte}'],
      exclude: ['src/**/*.test.{ts,js}', 'src/**/*.stories.svelte'],
      reporter: ['text', 'lcov'],
    },
  },
});
