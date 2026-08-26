import { defineConfig } from '@playwright/test';

const databaseUrl =
  process.env.DATABASE_URL ?? 'postgres://opentournament:opentournament@localhost:5432/opentournament';
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'pnpm --filter @opentournament/api start',
      url: 'http://localhost:4000/healthz',
      reuseExistingServer,
      timeout: 120_000,
      env: {
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'development',
        ALLOW_UNVERIFIED_EMAILS: 'true',
        SEED_DEMO_DATA: 'true',
      },
    },
    {
      command: 'pnpm --filter @opentournament/web dev',
      url: 'http://localhost:3000',
      reuseExistingServer,
      timeout: 120_000,
      env: {
        API_URL: 'http://localhost:4000',
      },
    },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
