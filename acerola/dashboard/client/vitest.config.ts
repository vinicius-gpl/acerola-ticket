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
      $app: fileURLToPath(new URL('./src/lib/test-utils/app-mock', import.meta.url)),
    },
  },
  test: {
    name: 'client',
    include: ['src/**/*.test.{ts,js}'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,svelte}'],
      exclude: ['src/**/*.test.{ts,js}', 'src/**/*.stories.svelte'],
      reporter: ['text', 'lcov'],
    },
  },
});
