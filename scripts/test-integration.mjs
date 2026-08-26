import { randomUUID } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const POSTGRES_IMAGE = 'postgres:16-alpine';
const POSTGRES_USER = 'opentournament';
const POSTGRES_PASSWORD = 'opentournament';
const POSTGRES_DATABASE = 'opentournament_test';
const POSTGRES_READY_ATTEMPTS = 60;
const POSTGRES_READY_INTERVAL_MS = 500;

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function runCaptured(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

function runInherited(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      shell: false,
      stdio: 'inherit',
      windowsHide: true,
    });
    child.once('error', reject);
    child.once('close', (code) => resolve(code ?? 1));
  });
}

export function getPublishedPostgresPort(output) {
  const match = output.trim().match(/:(\d+)$/u);
  const port = match ? Number.parseInt(match[1], 10) : Number.NaN;
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('Docker did not report a valid published PostgreSQL port.');
  }
  return port;
}

export function buildTestDatabaseUrl(port) {
  return `postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@127.0.0.1:${port}/${POSTGRES_DATABASE}`;
}

export function createContainerName(processId = process.pid, runId = randomUUID()) {
  const normalizedRunId = runId
    .toLowerCase()
    .replaceAll(/[^a-z0-9]/gu, '')
    .slice(0, 8);
  return `opentournament-integration-${processId}-${normalizedRunId}`;
}

export function getPnpmInvocation(
  nodeExecutable = process.execPath,
  pnpmEntrypoint = process.env.npm_execpath,
  platform = process.platform,
) {
  if (pnpmEntrypoint) return { command: nodeExecutable, args: [pnpmEntrypoint] };
  if (platform === 'win32') return { command: 'cmd.exe', args: ['/d', '/s', '/c', 'pnpm'] };
  return { command: 'pnpm', args: [] };
}

async function waitForPostgres(containerName) {
  for (let attempt = 0; attempt < POSTGRES_READY_ATTEMPTS; attempt += 1) {
    const readiness = spawnSync(
      'docker',
      ['exec', containerName, 'pg_isready', '-U', POSTGRES_USER, '-d', POSTGRES_DATABASE],
      { encoding: 'utf8', shell: false, windowsHide: true },
    );
    if (readiness.status === 0) return;
    await delay(POSTGRES_READY_INTERVAL_MS);
  }
  throw new Error('The temporary PostgreSQL container did not become ready within 30 seconds.');
}

async function runApiIntegrationTests(testDatabaseUrl) {
  const pnpm = getPnpmInvocation();
  return runInherited(pnpm.command, [...pnpm.args, '--filter', '@opentournament/api', 'test'], {
    ...process.env,
    TEST_DATABASE_URL: testDatabaseUrl,
  });
}

export async function main() {
  const configuredDatabaseUrl = process.env.TEST_DATABASE_URL?.trim();
  if (configuredDatabaseUrl) {
    console.log('Using the configured TEST_DATABASE_URL.');
    return runApiIntegrationTests(configuredDatabaseUrl);
  }

  const dockerCheck = await runCaptured('docker', ['version', '--format', '{{.Server.Version}}']);
  if (dockerCheck.code !== 0) {
    throw new Error(
      `Docker is not available: ${dockerCheck.stderr.trim() || 'start Docker Desktop'}`,
    );
  }

  const containerName = createContainerName();
  let containerStarted = false;
  let containerStopped = false;

  const stopContainer = () => {
    if (!containerStarted || containerStopped) return;
    containerStopped = true;
    spawnSync('docker', ['stop', containerName], {
      encoding: 'utf8',
      shell: false,
      stdio: 'ignore',
      windowsHide: true,
    });
  };

  process.once('exit', stopContainer);

  try {
    console.log(`Starting isolated PostgreSQL container ${containerName}...`);
    const start = await runCaptured('docker', [
      'run',
      '--rm',
      '--detach',
      '--name',
      containerName,
      '--env',
      `POSTGRES_USER=${POSTGRES_USER}`,
      '--env',
      `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
      '--env',
      `POSTGRES_DB=${POSTGRES_DATABASE}`,
      '--publish',
      '127.0.0.1::5432',
      POSTGRES_IMAGE,
    ]);
    if (start.code !== 0) throw new Error(`PostgreSQL could not start: ${start.stderr.trim()}`);
    containerStarted = true;

    const publishedPort = await runCaptured('docker', ['port', containerName, '5432/tcp']);
    if (publishedPort.code !== 0) {
      throw new Error(
        `The PostgreSQL port could not be discovered: ${publishedPort.stderr.trim()}`,
      );
    }

    const port = getPublishedPostgresPort(publishedPort.stdout);
    await waitForPostgres(containerName);
    console.log(`PostgreSQL is ready on 127.0.0.1:${port}. Running API integration tests...`);
    return await runApiIntegrationTests(buildTestDatabaseUrl(port));
  } finally {
    stopContainer();
    process.removeListener('exit', stopContainer);
  }
}

const isDirectExecution = process.argv[1]
  ? pathToFileURL(process.argv[1]).href === import.meta.url
  : false;

if (isDirectExecution) {
  try {
    process.exitCode = await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
