import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

/**
 * E2E da API roda contra um Postgres DE VERDADE, não contra mock: o que estes testes precisam
 * provar é justamente o que mock não prova — que a migration sobe, que a restrição do banco
 * recusa, e que erro do banco chega como 4xx.
 *
 * UM ARQUIVO POR VEZ. Os arquivos compartilham o MESMO banco de teste (`TEST_DATABASE_URL`),
 * e cada um sobe a aplicação inteira — o que inclui aplicar as migrations pendentes. Em
 * paralelo, dois arquivos tentam criar a mesma tabela e a mesma restrição ao mesmo tempo, e um
 * dos dois falha com "constraint já existe". Sequencial é mais lento e é o único correto: o
 * banco é um recurso de verdade, não uma cópia por processo.
 *
 * Ficam fora de `npm test` porque sobem a aplicação inteira e dependem de um banco na nuvem.
 */
export default defineConfig({
  plugins: [swc.vite({ module: { type: 'es6' } })],
  test: {
    name: 'server-e2e',
    include: ['test/**/*.e2e.ts'],
    fileParallelism: false,
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
