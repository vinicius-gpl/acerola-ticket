import { expect, test } from '@playwright/test';

/**
 * O fluxo principal da feature de exemplo, como a pessoa faz: abrir, errar, corrigir, criar.
 *
 * O título leva a hora no nome para o teste não depender do que já existe no banco.
 */
test('creates a task after fixing an empty title', async ({ page }) => {
  const title = `Tarefa E2E ${Date.now()}`;

  await page.goto('/');
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
