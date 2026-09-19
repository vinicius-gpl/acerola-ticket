import { defineConfig, devices } from '@playwright/test';

/**
 * E2E da WEB: o navegador de verdade, a API de verdade e um banco descartável.
 *
 * O Playwright sobe o `npm run dev` da raiz sozinho (`webServer`) e aponta o server para um
 * arquivo SQLite só dos testes — nunca o `app.db` de quem está desenvolvendo, que perderia os
 * dados a cada execução.
 *
 * Na primeira vez, baixe o navegador:  npx playwright install chromium
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    cwd: '..',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { DATABASE_FILE: './data/e2e.db' },
  },
});
