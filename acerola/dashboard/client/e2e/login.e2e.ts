import { expect, test } from '@playwright/test';

import { E2E_USER } from './global-setup';

test.skip(!process.env.TEST_DATABASE_URL, 'Precisa de TEST_DATABASE_URL no server/.env');

// triste
test('refuses the wrong password without saying which part is wrong', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(E2E_USER.email);
  await page.getByLabel('Senha').fill('senha-errada');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await expect(page.getByText('E-mail ou senha incorretos.')).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test('sends an unauthenticated visitor to /login instead of /tasks', async ({ page }) => {
  await page.goto('/tasks');

  await expect(page).toHaveURL(/\/login/);
});

// feliz
test('logs out from the sidebar and lands back on /login', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(E2E_USER.email);
  await page.getByLabel('Senha').fill(E2E_USER.password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('heading', { name: 'Tarefas' })).toBeVisible();

  await page.getByRole('button', { name: 'Sair' }).click();

  await expect(page).toHaveURL(/\/login/);
  await page.goto('/tasks');
  await expect(page).toHaveURL(/\/login/);
});
