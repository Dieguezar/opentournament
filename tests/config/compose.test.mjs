import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const compose = await readFile(new URL('../../docker-compose.yml', import.meta.url), 'utf8');
const envExample = await readFile(new URL('../../.env.example', import.meta.url), 'utf8');
const composeSmoke = await readFile(
  new URL('../../.github/workflows/compose-smoke.yml', import.meta.url),
  'utf8',
).catch(() => '');
const ciWorkflow = await readFile(
  new URL('../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const codeqlWorkflow = await readFile(
  new URL('../../.github/workflows/codeql.yml', import.meta.url),
  'utf8',
);
const envExampleEntries = Object.fromEntries(
  envExample
    .split(/\r?\n/u)
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const separator = line.indexOf('=');
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const publishedPorts = [
  ['POSTGRES_HOST_PORT', 5432, 5432],
  ['MINIO_API_HOST_PORT', 9000, 9000],
  ['MINIO_CONSOLE_HOST_PORT', 9001, 9001],
  ['API_HOST_PORT', 4000, 4000],
  ['WEB_HOST_PORT', 3000, 3000],
];

test('allows every Compose host port to be overridden', () => {
  for (const [variable, defaultPort, containerPort] of publishedPorts) {
    assert.match(
      compose,
      new RegExp(`127\\.0\\.0\\.1:\\$\\{${variable}:-${defaultPort}\\}:${containerPort}`),
      `${variable} must configure the published host port`,
    );
  }
});

test('documents every Compose host port in the environment example', () => {
  for (const [variable, defaultPort] of publishedPorts) {
    assert.match(envExample, new RegExp(`^${variable}=${defaultPort}$`, 'm'));
  }
});

test('ships environment defaults accepted by the runtime validator', () => {
  assert.ok(
    envExampleEntries.SESSION_SECRET.length >= 32,
    'SESSION_SECRET must contain at least 32 characters',
  );

  const discordRedirectUri = envExampleEntries.DISCORD_REDIRECT_URI;
  assert.ok(
    discordRedirectUri === '' || URL.canParse(discordRedirectUri),
    'DISCORD_REDIRECT_URI must be empty or an absolute URL',
  );
});

test('uses production-safe authentication and demo defaults', () => {
  assert.match(compose, /NODE_ENV: \$\{COMPOSE_NODE_ENV:-production\}/u);
  assert.match(compose, /SESSION_SECRET: \$\{SESSION_SECRET:\?/u);
  assert.match(compose, /ALLOW_UNVERIFIED_EMAILS: \$\{ALLOW_UNVERIFIED_EMAILS:-false\}/u);
  assert.match(compose, /SEED_DEMO_DATA: \$\{SEED_DEMO_DATA:-false\}/u);
  assert.equal(envExampleEntries.COMPOSE_NODE_ENV, 'production');
  assert.equal(envExampleEntries.ALLOW_UNVERIFIED_EMAILS, 'false');
  assert.equal(envExampleEntries.SEED_DEMO_DATA, 'false');
});

test('keeps MinIO credentials aligned with the API storage client', () => {
  assert.match(compose, /MINIO_ROOT_USER: \$\{S3_ACCESS_KEY/u);
  assert.match(compose, /MINIO_ROOT_PASSWORD: \$\{S3_SECRET_KEY/u);
  assert.match(compose, /S3_ACCESS_KEY: \$\{S3_ACCESS_KEY/u);
  assert.match(compose, /S3_SECRET_KEY: \$\{S3_SECRET_KEY/u);
});

test('keeps container database credentials aligned with the API connection', () => {
  assert.match(compose, /POSTGRES_USER: \$\{POSTGRES_USER/u);
  assert.match(compose, /POSTGRES_PASSWORD: \$\{POSTGRES_PASSWORD/u);
  assert.match(compose, /POSTGRES_DB: \$\{POSTGRES_DB/u);
  assert.match(compose, /DATABASE_URL: \$\{DATABASE_URL_DOCKER/u);

  const containerDatabaseUrl = new URL(envExampleEntries.DATABASE_URL_DOCKER);
  assert.equal(containerDatabaseUrl.username, envExampleEntries.POSTGRES_USER);
  assert.equal(containerDatabaseUrl.password, envExampleEntries.POSTGRES_PASSWORD);
  assert.equal(containerDatabaseUrl.pathname.slice(1), envExampleEntries.POSTGRES_DB);
});

test('supports different S3 endpoints on the host and inside Compose', () => {
  assert.match(compose, /S3_ENDPOINT: \$\{S3_ENDPOINT_DOCKER/u);
  assert.equal(envExampleEntries.S3_ENDPOINT, 'http://localhost:9000');
  assert.equal(envExampleEntries.S3_ENDPOINT_DOCKER, 'http://minio:9000');
});

test('forwards every documented API runtime setting', () => {
  const forwardedSettings = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
    'SMTP_SECURE',
    'S3_REGION',
    'S3_BUCKET',
    'S3_FORCE_PATH_STYLE',
    'MAX_EVIDENCE_SIZE_MB',
    'MAX_EVIDENCE_FILES_PER_SUBMISSION',
    'RATE_LIMIT_GLOBAL_PER_MIN',
  ];

  for (const variable of forwardedSettings) {
    assert.match(compose, new RegExp(`${variable}: \\$\\{${variable}`));
    assert.ok(variable in envExampleEntries, `${variable} must be documented in .env.example`);
  }
});

test('probes Node services through the IPv4 loopback inside Alpine containers', () => {
  assert.match(compose, /wget -q -O - http:\/\/127\.0\.0\.1:4000\/healthz/u);
  assert.match(compose, /wget -q -O - http:\/\/127\.0\.0\.1:3000/u);
  assert.doesNotMatch(compose, /wget[^\n]*http:\/\/localhost:(?:3000|4000)/u);
});

test('does not advertise environment variables ignored by the runtime', () => {
  for (const variable of [
    'JWT_SECRET',
    'CSRF_SECRET',
    'DISCORD_BOT_ENABLED',
    'S3_PUBLIC_BASE_URL',
  ]) {
    assert.equal(
      variable in envExampleEntries,
      false,
      `${variable} is not consumed by the runtime`,
    );
  }
});

test('provides a safe manual smoke test for a clean Compose installation', () => {
  assert.match(composeSmoke, /workflow_dispatch:/u);
  assert.match(composeSmoke, /openssl rand -hex 32/u);
  assert.match(composeSmoke, /docker compose up -d --build/u);
  assert.match(composeSmoke, /http:\/\/127\.0\.0\.1:4000\/healthz/u);
  assert.match(composeSmoke, /http:\/\/127\.0\.0\.1:3000/u);
  assert.match(composeSmoke, /if: failure\(\)/u);
  assert.match(composeSmoke, /docker compose logs --no-color/u);
  assert.match(composeSmoke, /if: always\(\)/u);
  assert.match(composeSmoke, /docker compose down --volumes --remove-orphans/u);
  assert.doesNotMatch(composeSmoke, /SEED_DEMO_DATA=true/u);
});

test('uses GitHub Actions backed by the supported Node 24 runtime', () => {
  const workflows = [ciWorkflow, codeqlWorkflow, composeSmoke].join('\n');

  assert.doesNotMatch(workflows, /actions\/checkout@v[1-6]\b/u);
  assert.doesNotMatch(workflows, /actions\/setup-node@v[1-6]\b/u);
  assert.doesNotMatch(workflows, /pnpm\/action-setup@v[1-5]\b/u);
  assert.doesNotMatch(workflows, /github\/codeql-action\/(?:init|analyze)@v[1-3]\b/u);
  assert.match(workflows, /actions\/checkout@v7/u);
  assert.match(workflows, /actions\/setup-node@v7/u);
  assert.match(workflows, /pnpm\/action-setup@v6/u);
  assert.match(workflows, /github\/codeql-action\/init@v4/u);
  assert.match(workflows, /github\/codeql-action\/analyze@v4/u);
});
