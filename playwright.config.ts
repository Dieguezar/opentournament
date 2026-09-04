import { defineConfig } from '@playwright/test';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgres://opentournament:opentournament@localhost:5432/opentournament';
const s3Endpoint = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
const apiPort = Number(process.env.PLAYWRIGHT_API_PORT ?? 4000);
const webPort = Number(process.env.PLAYWRIGHT_WEB_PORT ?? 3000);
const apiUrl = `http://localhost:${apiPort}`;
const webUrl = `http://localhost:${webPort}`;
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_EXISTING_SERVER === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 90_000,
  fullyParallel: false,
  // The scenarios share the E2E server and database. A single worker prevents mutable flows
  // from interfering with the demo showcases.
  workers: 1,
  retries: 0,
  use: {
    baseURL: webUrl,
    locale: 'es-GT',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'pnpm --filter @opentournament/api start',
      url: `${apiUrl}/healthz`,
      reuseExistingServer,
      timeout: 120_000,
      env: {
        DATABASE_URL: databaseUrl,
        PORT: String(apiPort),
        NODE_ENV: 'development',
        ALLOW_UNVERIFIED_EMAILS: 'true',
        RATE_LIMIT_GLOBAL_PER_MIN: '100000',
        SEED_DEMO_DATA: 'true',
        S3_ENDPOINT: s3Endpoint,
        S3_ACCESS_KEY: process.env.S3_ACCESS_KEY ?? 'minioadmin',
        S3_SECRET_KEY: process.env.S3_SECRET_KEY ?? 'minioadmin',
        S3_BUCKET: process.env.S3_BUCKET ?? 'opentournament',
        S3_FORCE_PATH_STYLE: 'true',
      },
    },
    {
      command: `pnpm --filter @opentournament/web exec next dev --port ${webPort}`,
      url: webUrl,
      reuseExistingServer,
      timeout: 120_000,
      env: {
        API_URL: apiUrl,
      },
    },
  ],
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
