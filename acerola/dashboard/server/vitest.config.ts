import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * O SWC entra porque o Nest usa decorator com metadata em runtime, e o esbuild do
 * Vite não emite `emitDecoratorMetadata` — sem isso a injeção de dependência quebra
 * dentro do teste.
 */
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    name: 'server',
    include: ['src/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.module.ts', 'src/**/*.dto.ts', 'src/main.ts'],
      reporter: ['text', 'lcov'],
    },
  },
});
