import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * E2E da API roda contra um SQLite DE VERDADE, não contra mock: o que estes testes precisam
 * provar é justamente o que mock não prova — que a migration sobe, que a restrição do banco
 * recusa, e que erro do banco chega como 4xx.
 *
 * Cada arquivo abre o próprio banco em memória (`:memory:`), então não há o que preparar
 * antes nem o que limpar depois. Ficam fora de `npm test` porque sobem a aplicação inteira.
 */
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    name: 'server-e2e',
    include: ['test/**/*.e2e.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
