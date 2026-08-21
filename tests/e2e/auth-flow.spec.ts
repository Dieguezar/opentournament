import { expect, test } from '@playwright/test';

test('registro → wizard → dashboard', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto('/register');
  await page.getByLabel('Nombre').fill('Usuario E2E');
  await page.getByLabel('Correo').fill(email);
  await page.getByLabel('Contraseña (mínimo 8 caracteres)').fill('password-123');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await page.waitForURL('**/dashboard');
  await expect(page.getByRole('heading', { name: 'Hola, Usuario E2E' })).toBeVisible();
  await expect(page.getByText('Todavía no tienes torneos.')).toBeVisible();

  await page.getByRole('link', { name: 'Crear organización' }).click();
  await page.waitForURL('**/wizard');
  await page.getByLabel('Nombre de la organización').fill('Comunidad E2E');
  await page.getByLabel('Slug (URL)').fill(`e2e-${Date.now()}`);
  await page.getByRole('button', { name: 'Crear organización' }).click();

  await page.waitForURL('**/dashboard');
  await expect(page.getByText('Comunidad E2E')).toBeVisible();
});
