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
  await expect(page.getByRole('heading', { name: 'Tu espacio está listo' })).toBeVisible();

  await page.getByRole('link', { name: 'Crear organización' }).click();
  await page.waitForURL('**/wizard');
  await page.getByLabel('Nombre de la organización').fill('Comunidad E2E');
  await page.getByLabel('Slug (URL)').fill(`e2e-${Date.now()}`);
  await page.getByRole('button', { name: 'Crear organización' }).click();

  await page.waitForURL('**/dashboard');
  await expect(page.getByText('Comunidad E2E')).toBeVisible();
});

test('demo poblada → torneo → bracket → disputa resuelta', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Correo').fill('admin@opentournament.local');
  await page.getByLabel('Contraseña').fill('demo-password-123');
  await page.getByRole('button', { name: 'Entrar' }).click();

  await page.waitForURL('**/dashboard');
  await expect(page.getByRole('heading', { name: 'Copa Nexo 2026' })).toBeVisible();
  await expect(page.getByText('Demo incluida')).toBeVisible();
  await expect(page.getByText('Valorant · Eliminación sencilla')).toBeVisible();
  await expect(page.getByText('Aurora Gaming')).toBeVisible();
  await expect(page.getByText('Quetzal Esports')).toBeVisible();

  await page.getByRole('link', { name: 'Ver página pública' }).click();
  await page.waitForURL('**/t/copa-nexo-demo');
  await expect(
    page.getByText(
      'El torneo ya está en curso. Las inscripciones y el check-in cerraron; seguí las partidas en el bracket.',
    ),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Equipos inscritos (4)' })).toBeVisible();
  await expect(page.getByText('Finalizada')).toHaveCount(2);
  await expect(page.getByText('Programada')).toHaveCount(1);
  await expect(page.getByTestId('bracket-connector')).toHaveCount(2);
  await expect(page.getByTestId('bracket-connector').first()).toBeVisible();

  await page.getByRole('link', { name: 'Torneos' }).click();
  await page.getByRole('link', { name: 'Administrar torneo' }).click();
  await expect(page.getByRole('heading', { name: 'Check-in (4)' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Rondas' })).toBeVisible();

  await page.getByRole('link', { name: 'Disputas', exact: true }).click();
  await expect(page.getByText('Resultados contradictorios')).toBeVisible();
  await expect(page.getByText('Resuelta')).toBeVisible();
  await page.getByRole('link', { name: 'Titanes del Centro vs Pixel Forge' }).click();
  await expect(page.getByRole('heading', { name: 'Resolución' })).toBeVisible();
  await expect(page.getByText('La evidencia del servidor confirma')).toBeVisible();
});

test('demo Smash → 8 participantes → personajes y games visibles', async ({ page }) => {
  await page.goto('/t/smash-random-showdown');

  await expect(page.getByRole('heading', { name: 'Smash Random Showdown' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jugadores inscritos (8)' })).toBeVisible();
  await expect(page.getByText('Finalizada')).toHaveCount(15);
  await expect(page.getByTestId('smash-character')).toHaveCount(30);
  await expect(page.getByText(/^[2-5] games$/)).toHaveCount(15);
});

test('demo LoL → 8 equipos → reglas y partidas de cada serie visibles', async ({ page }) => {
  await page.goto('/t/liga-nexo-lol');

  await expect(page.getByRole('heading', { name: 'Liga Nexo LoL' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Equipos inscritos (8)' })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Reglas competitivas de League of Legends' }),
  ).toBeVisible();
  await expect(page.getByText('Tournament Draft · Fearless activado')).toBeVisible();
  await expect(page.getByText('Parche fijo 26.16 · Región LAN')).toBeVisible();
  await expect(page.getByText('Finalizada')).toHaveCount(7);
  await expect(page.getByTestId('lol-blue-side')).toHaveCount(14);
  await expect(page.getByText(/^[23] partidas · \d+ min$/)).toHaveCount(7);
});
