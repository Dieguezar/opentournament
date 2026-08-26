import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadApiEnv, loadEnvironmentFiles } from './index.js';

describe('loadEnvironmentFiles', () => {
  it('loads the workspace fallback when the current package has no .env', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'opentournament-config-'));
    const workspaceEnv = join(directory, 'workspace.env');
    const targetEnvironment: Record<string, string> = {};

    try {
      await writeFile(workspaceEnv, 'DATABASE_URL=postgres://workspace.example/test\n');

      loadEnvironmentFiles([join(directory, 'missing.env'), workspaceEnv], targetEnvironment);

      expect(targetEnvironment.DATABASE_URL).toBe('postgres://workspace.example/test');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

describe('loadApiEnv', () => {
  it('rejects the documented placeholder secret in production', () => {
    expect(() =>
      loadApiEnv({
        NODE_ENV: 'production',
        SESSION_SECRET: 'change-me-generate-with-openssl-rand-hex-32',
      }),
    ).toThrow(/SESSION_SECRET/);
  });

  it('loads a configurable global rate limit', () => {
    const env = loadApiEnv({
      NODE_ENV: 'test',
      SESSION_SECRET: 'test-session-secret-with-at-least-32-chars',
      RATE_LIMIT_GLOBAL_PER_MIN: '450',
    });

    expect(env.RATE_LIMIT_GLOBAL_PER_MIN).toBe(450);
  });
});
