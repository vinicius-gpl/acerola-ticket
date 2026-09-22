import { expect, test } from '@playwright/test';

import { E2E_USER } from './global-setup';

/**
 * O fluxo principal da feature de exemplo, como a pessoa faz: logar, abrir, errar, corrigir,
 * criar.
 *
 * O título leva a hora no nome para o teste não depender do que já existe no banco.
 *
 * Sem `TEST_DATABASE_URL` (ver `playwright.config.ts`), pula em vez de arriscar rodar contra
 * o banco de trabalho.
 */
test.skip(!process.env.TEST_DATABASE_URL, 'Precisa de TEST_DATABASE_URL no server/.env');

test('creates a task after fixing an empty title', async ({ page }) => {
  const title = `Tarefa E2E ${Date.now()}`;

  /* Login próprio, do jeito que a pessoa faz: `/tasks` exige sessão, então o primeiro passo
     de QUALQUER fluxo agora é este. */
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(E2E_USER.email);
  await page.getByLabel('Senha').fill(E2E_USER.password);
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByRole('heading', { name: 'Tarefas' })).toBeVisible();

  await page.getByRole('button', { name: 'Nova tarefa' }).first().click();
  await page.getByRole('button', { name: 'Criar tarefa' }).click();
  await expect(page.getByText('Informe o título')).toBeVisible();

  await page.getByLabel('Título').fill(title);
  await expect(page.getByText('Informe o título')).toBeHidden();
  await page.getByRole('button', { name: 'Criar tarefa' }).click();

  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(page.getByText(title)).toBeVisible();
});
