import { readFileSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

/**
 * Lê `TEST_DATABASE_URL` do `server/.env` sem depender do `dotenv` (o client não tem essa
 * lib): é só uma variável, e ela já vem documentada em `server/.env.example`.
 */
function readTestDatabaseUrl(): string | undefined {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  try {
    const envFile = readFileSync('../server/.env', 'utf8');

    return envFile.match(/^TEST_DATABASE_URL=(.*)$/m)?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

const testDatabaseUrl = readTestDatabaseUrl();
if (testDatabaseUrl) process.env.TEST_DATABASE_URL = testDatabaseUrl;

/**
 * E2E da WEB: o navegador de verdade, a API de verdade e um banco descartável.
 *
 * O Playwright sobe o `npm run dev` da raiz sozinho (`webServer`) e aponta o server para a
 * `TEST_DATABASE_URL` (uma branch de banco só para teste na Neon) — nunca a `DATABASE_URL` de
 * quem está desenvolvendo, que perderia os dados a cada execução.
 *
 * Sem `TEST_DATABASE_URL` no `server/.env`, o teste em si é pulado (ver `e2e/tasks.e2e.ts`) em
 * vez de arriscar rodar contra o banco de trabalho.
 *
 * Na primeira vez, baixe o navegador:  npx playwright install chromium
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  /* Cria a conta de teste antes de QUALQUER teste rodar — sem ela, `/tasks` (que agora exige
     login) rejeitaria logo de cara. `global-setup.ts` mesmo pula sozinho sem `TEST_DATABASE_URL`. */
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5176',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    cwd: '..',
    url: 'http://localhost:5176',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: testDatabaseUrl ? { DATABASE_URL: testDatabaseUrl } : {},
  },
});
