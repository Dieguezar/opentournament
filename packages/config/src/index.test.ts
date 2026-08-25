import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { loadEnvironmentFiles } from './index.js';

describe('loadEnvironmentFiles', () => {
  it('loads the workspace fallback when the current package has no .env', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'opentournament-config-'));
    const workspaceEnv = join(directory, 'workspace.env');
    const targetEnvironment: Record<string, string> = {};

    try {
      await writeFile(workspaceEnv, 'DATABASE_URL=postgres://workspace.example/test\n');

      loadEnvironmentFiles(
        [join(directory, 'missing.env'), workspaceEnv],
        targetEnvironment,
      );

      expect(targetEnvironment.DATABASE_URL).toBe('postgres://workspace.example/test');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
