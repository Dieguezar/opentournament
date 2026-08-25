import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const compose = await readFile(new URL('../../docker-compose.yml', import.meta.url), 'utf8');
const envExample = await readFile(new URL('../../.env.example', import.meta.url), 'utf8');
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
