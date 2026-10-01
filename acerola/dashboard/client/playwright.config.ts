import { readFileSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

/**
 * Lê uma variável do `server/.env` sem depender do `dotenv` (o client não tem essa lib): são
 * poucas, e todas já vêm documentadas em `server/.env.example`.
 */
function readServerEnv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const envFile = readFileSync('../server/.env', 'utf8');

    return envFile.match(new RegExp(`^${name}=(.*)$`, 'm'))?.[1]?.trim() || undefined;
  } catch {
    return undefined;
  }
}

const testDatabaseUrl = readServerEnv('TEST_DATABASE_URL');
if (testDatabaseUrl) process.env.TEST_DATABASE_URL = testDatabaseUrl;

/* A conta que o teste usa para entrar. Vive no Neon Auth, não no banco — ver `e2e/e2e-user.ts`. */
for (const name of ['E2E_USER_EMAIL', 'E2E_USER_PASSWORD']) {
  const value = readServerEnv(name);
  if (value) process.env[name] = value;
}

/**
 * E2E da WEB: o navegador de verdade, a API de verdade e um banco descartável.
 *
 * O Playwright sobe o `npm run dev` da raiz sozinho (`webServer`) e aponta o server para a
 * `TEST_DATABASE_URL` (uma branch de banco só para teste na Neon) — nunca a `DATABASE_URL` de
 * quem está desenvolvendo, que perderia os dados a cada execução.
 *
 * Sem `TEST_DATABASE_URL` no `server/.env`, o teste em si é pulado (ver `e2e/tasks.e2e.ts`) em
 * vez de arriscar rodar contra o banco de trabalho. O login acontece no Neon Auth, então o
 * teste também precisa de uma conta de teste de verdade (`E2E_USER_EMAIL`/`E2E_USER_PASSWORD`).
 *
 * Na primeira vez, baixe o navegador:  npx playwright install chromium
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  /**
   * Quinze segundos, e não os cinco do padrão.
   *
   * Em desenvolvimento o Vite compila os módulos de cada rota NA PRIMEIRA VEZ que alguém a
   * abre. A primeira navegação de uma execução leva alguns segundos antes de a tela reagir, e
   * com cinco segundos a asserção estourava ali — parecendo defeito da guarda de sessão, que
   * está certa (ela redireciona ao receber 401 de `/api/auth/me`).
   *
   * Aumentar o teto não deixa teste ruim passar: quem falha de verdade falha igual, só demora
   * mais para desistir.
   */
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://localhost:5005',
    locale: 'pt-BR',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run dev',
    cwd: '..',
    /**
     * ESPERA A API, não a tela.
     *
     * A tela do Vite sobe em segundos; a API compila o TypeScript inteiro antes de escutar, e
     * leva mais de um minuto numa partida fria. Esperando só a tela, o teste começa enquanto a
     * API ainda compila e TODA requisição volta 502 — o sintoma parece defeito da tela.
     *
     * A rota de saúde é o sinal certo porque ela só responde 200 depois de a API falar com o
     * banco. E esperar pela API já implica a tela: ela subiu muito antes.
     */
    url: `http://localhost:${readServerEnv('API_PORT') ?? '3005'}/api/health`,
    reuseExistingServer: !process.env.CI,
    /* Generoso porque a conta é a compilação fria do server, não a partida dele. */
    timeout: 240_000,
    env: testDatabaseUrl ? { DATABASE_URL: testDatabaseUrl } : {},
  },
});
