import { spawn, spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const COMPOSE_COMMAND_LABEL = 'docker compose';
const QUICK_TUNNEL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/iu;
const WEB_HEALTH_URL = 'http://127.0.0.1:3000';

export function extractQuickTunnelUrl(output) {
  return output.match(QUICK_TUNNEL_PATTERN)?.[0] ?? null;
}

function runDocker(args, options = {}) {
  return spawnSync('docker', args, {
    encoding: 'utf8',
    ...options,
  });
}

function requireSuccessfulCommand(args, failureMessage) {
  const result = runDocker(args);
  if (result.error || result.status !== 0) {
    throw new Error(`${failureMessage}\n${result.stderr?.trim() || result.error?.message || ''}`);
  }
  return result.stdout.trim();
}

function verifyPrerequisites() {
  requireSuccessfulCommand(
    ['version', '--format', '{{.Server.Version}}'],
    'Docker is not available.',
  );
  requireSuccessfulCommand(['compose', 'version'], 'Docker Compose v2 is not available.');

  const runningServices = requireSuccessfulCommand(
    ['compose', 'ps', '--services', '--status', 'running'],
    `Unable to inspect services with ${COMPOSE_COMMAND_LABEL}.`,
  );
  if (!runningServices.split(/\r?\n/u).includes('web')) {
    throw new Error('The web service is not running. Start OpenTournament before sharing it.');
  }

  requireSuccessfulCommand(
    ['compose', 'exec', '-T', 'web', 'wget', '-q', '-O', '-', WEB_HEALTH_URL],
    'The web service is running but did not pass its internal health check.',
  );
}

function removeShareContainer() {
  runDocker(['compose', '--profile', 'share', 'rm', '--stop', '--force', 'cloudflared'], {
    stdio: 'ignore',
  });
}

function printWarnings() {
  console.log('Starting an explicit Cloudflare Quick Tunnel for testing.');
  console.log('WARNING: Anyone who knows the generated URL can access the site.');
  console.log('WARNING: There is no uptime guarantee and Server-Sent Events are not supported.');
  console.log('The bracket may require a manual refresh to show changes.');
  console.log('Press Ctrl+C to stop sharing and remove the temporary container.');
}

async function main() {
  verifyPrerequisites();
  removeShareContainer();
  printWarnings();

  const tunnel = spawn(
    'docker',
    ['compose', '--profile', 'share', 'up', '--no-deps', 'cloudflared'],
    { stdio: ['inherit', 'pipe', 'pipe'] },
  );
  let recentOutput = '';
  let tunnelUrl = null;
  let isStopping = false;

  function forwardOutput(chunk, destination) {
    destination.write(chunk);
    recentOutput = `${recentOutput}${chunk.toString()}`.slice(-8_192);
    const detectedUrl = extractQuickTunnelUrl(recentOutput);
    if (detectedUrl && detectedUrl !== tunnelUrl) {
      tunnelUrl = detectedUrl;
      console.log(`\nPublic test URL: ${detectedUrl}\n`);
    }
  }

  tunnel.stdout.on('data', (chunk) => forwardOutput(chunk, process.stdout));
  tunnel.stderr.on('data', (chunk) => forwardOutput(chunk, process.stderr));

  function stopTunnel() {
    if (isStopping) return;
    isStopping = true;
    console.log('\nStopping the temporary tunnel...');
    removeShareContainer();
  }

  process.once('SIGINT', stopTunnel);
  process.once('SIGTERM', stopTunnel);

  const exitCode = await new Promise((resolveExit) => {
    tunnel.once('error', () => resolveExit(1));
    tunnel.once('exit', (code) => resolveExit(code ?? 1));
  });
  stopTunnel();

  if (!tunnelUrl && exitCode === 0) {
    throw new Error('The tunnel stopped before Cloudflare produced a public URL.');
  }
  process.exitCode = exitCode;
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isDirectExecution) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    removeShareContainer();
    process.exitCode = 1;
  });
}
