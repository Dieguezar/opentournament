import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildTestDatabaseUrl,
  createContainerName,
  getPnpmInvocation,
  getPublishedPostgresPort,
} from '../../scripts/test-integration.mjs';

const rootPackage = JSON.parse(
  await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
);

test('exposes a single integration-test command', () => {
  assert.equal(rootPackage.scripts['test:integration'], 'node scripts/test-integration.mjs');
});

test('parses Docker IPv4 and IPv6 published-port output', () => {
  assert.equal(getPublishedPostgresPort('127.0.0.1:49153\n'), 49153);
  assert.equal(getPublishedPostgresPort('[::1]:49154\n'), 49154);
});

test('rejects missing or invalid Docker port output', () => {
  assert.throws(() => getPublishedPostgresPort(''), /published PostgreSQL port/u);
  assert.throws(() => getPublishedPostgresPort('127.0.0.1:70000'), /published PostgreSQL port/u);
});

test('builds an encoded test database URL on the discovered port', () => {
  assert.equal(
    buildTestDatabaseUrl(49153),
    'postgres://opentournament:opentournament@127.0.0.1:49153/opentournament_test',
  );
});

test('creates a Docker-safe, run-specific container name', () => {
  assert.match(
    createContainerName(1234, 'A0B1-C2D3-E4F5'),
    /^opentournament-integration-1234-a0b1c2d3$/u,
  );
});

test('runs the pnpm JavaScript entrypoint through Node when available', () => {
  assert.deepEqual(getPnpmInvocation('C:/node/node.exe', 'C:/pnpm/pnpm.cjs', 'win32'), {
    command: 'C:/node/node.exe',
    args: ['C:/pnpm/pnpm.cjs'],
  });
});
