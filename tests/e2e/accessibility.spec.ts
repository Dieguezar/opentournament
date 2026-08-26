import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const publicTournamentPages = [
  { path: '/t/liga-nexo-lol', title: 'Liga Nexo LoL' },
  { path: '/t/smash-random-showdown', title: 'Smash Random Showdown' },
] as const;

for (const tournament of publicTournamentPages) {
  test(`${tournament.title} no tiene violaciones WCAG A/AA detectables`, async ({ page }) => {
    await page.goto(tournament.path);
    await expect(page.getByRole('heading', { name: tournament.title, level: 1 })).toBeVisible();

    const { violations } = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });
}
