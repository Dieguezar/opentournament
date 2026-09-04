import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';

const suffix = `${process.pid}-${randomUUID().replaceAll('-', '').slice(0, 8)}`;
const postgres = `opentournament-e2e-postgres-${suffix}`;
const minio = `opentournament-e2e-minio-${suffix}`;

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true, ...options });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (chunk) => (stdout += chunk));
    child.stderr?.on('data', (chunk) => (stderr += chunk));
    child.once('error', reject);
    child.once('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function pnpm() {
  if (process.env.npm_execpath) return [process.execPath, [process.env.npm_execpath]];
  return process.platform === 'win32' ? ['cmd.exe', ['/d', '/s', '/c', 'pnpm']] : ['pnpm', []];
}

function stop(name) {
  spawnSync('docker', ['stop', name], { shell: false, stdio: 'ignore', windowsHide: true });
}

async function port(name, containerPort) {
  const result = await run('docker', ['port', name, containerPort]);
  const match = result.stdout.trim().match(/:(\d+)$/u);
  if (result.code || !match)
    throw new Error(`Docker did not publish ${containerPort} for ${name}.`);
  return Number(match[1]);
}

async function waitFor(url, label) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      // The isolated service has not bound its published port yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`${label} did not become ready within 30 seconds.`);
}

async function waitForPostgres() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const ready = spawnSync('docker', ['exec', postgres, 'pg_isready', '-U', 'opentournament'], {
      shell: false,
      windowsHide: true,
    });
    if (ready.status === 0) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('PostgreSQL did not become ready within 30 seconds.');
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  await new Promise((resolve) => server.close(resolve));
  if (!address || typeof address === 'string')
    throw new Error('Could not allocate an isolated port.');
  return address.port;
}

export async function main() {
  const docker = await run('docker', ['version', '--format', '{{.Server.Version}}']);
  if (docker.code) throw new Error(`Docker is unavailable: ${docker.stderr.trim()}`);
  let postgresStarted = false;
  let minioStarted = false;
  const cleanup = () => {
    if (minioStarted) stop(minio);
    if (postgresStarted) stop(postgres);
  };
  process.once('exit', cleanup);

  try {
    const pgStart = await run('docker', [
      'run',
      '--rm',
      '--detach',
      '--name',
      postgres,
      '--env',
      'POSTGRES_USER=opentournament',
      '--env',
      'POSTGRES_PASSWORD=opentournament',
      '--env',
      'POSTGRES_DB=opentournament_e2e',
      '--publish',
      '127.0.0.1::5432',
      'postgres:16-alpine',
    ]);
    if (pgStart.code) throw new Error(`PostgreSQL could not start: ${pgStart.stderr.trim()}`);
    postgresStarted = true;
    const minioStart = await run('docker', [
      'run',
      '--rm',
      '--detach',
      '--name',
      minio,
      '--env',
      'MINIO_ROOT_USER=minioadmin',
      '--env',
      'MINIO_ROOT_PASSWORD=minioadmin',
      '--publish',
      '127.0.0.1::9000',
      'minio/minio:latest',
      'server',
      '/data',
    ]);
    if (minioStart.code) throw new Error(`MinIO could not start: ${minioStart.stderr.trim()}`);
    minioStarted = true;
    const [postgresPort, minioPort, apiPort, webPort] = await Promise.all([
      port(postgres, '5432/tcp'),
      port(minio, '9000/tcp'),
      freePort(),
      freePort(),
    ]);
    await Promise.all([
      waitForPostgres(),
      waitFor(`http://127.0.0.1:${minioPort}/minio/health/live`, 'MinIO'),
    ]);
    const [command, args] = pnpm();
    const code = await new Promise((resolve, reject) => {
      const child = spawn(
        command,
        [...args, 'exec', 'playwright', 'test', 'tests/e2e/tournament-experience.spec.ts'],
        {
          env: {
            ...process.env,
            DATABASE_URL: `postgres://opentournament:opentournament@127.0.0.1:${postgresPort}/opentournament_e2e`,
            S3_ENDPOINT: `http://127.0.0.1:${minioPort}`,
            S3_ACCESS_KEY: 'minioadmin',
            S3_SECRET_KEY: 'minioadmin',
            S3_BUCKET: 'opentournament',
            PLAYWRIGHT_API_PORT: String(apiPort),
            PLAYWRIGHT_WEB_PORT: String(webPort),
            PLAYWRIGHT_BASE_URL: `http://localhost:${webPort}`,
          },
          shell: false,
          stdio: 'inherit',
          windowsHide: true,
        },
      );
      child.once('error', reject);
      child.once('close', (exitCode) => resolve(exitCode ?? 1));
    });
    return code;
  } finally {
    cleanup();
    process.removeListener('exit', cleanup);
  }
}

try {
  process.exitCode = await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
