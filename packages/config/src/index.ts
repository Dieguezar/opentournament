import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import { z } from 'zod';
import { config as loadDotenv } from 'dotenv';

export function getEnvironmentFilePaths(cwd = process.cwd()): string[] {
  return [
    ...new Set([resolve(cwd, '.env'), fileURLToPath(new URL('../../../.env', import.meta.url))]),
  ];
}

export function loadEnvironmentFiles(
  paths = getEnvironmentFilePaths(),
  targetEnvironment: NodeJS.ProcessEnv = process.env,
): void {
  loadDotenv({ path: paths, processEnv: targetEnvironment, quiet: true });
}

loadEnvironmentFiles();

const boolFromString = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');

const devSecret = 'dev-only-session-secret-change-me-32chars';
const insecureProductionSecrets = new Set([
  devSecret,
  'change-me-generate-with-openssl-rand-hex-32',
]);

const optionalUrl = z.preprocess(
  (value) => (value === '' || value === undefined ? undefined : value),
  z.string().url().optional(),
);

export const apiEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_URL: z.string().url().default('http://localhost:4000'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgres://opentournament:opentournament@localhost:5432/opentournament'),
  SESSION_SECRET: z
    .string()
    .min(32, 'SESSION_SECRET must contain at least 32 characters')
    .default(devSecret),
  SESSION_TTL_HOURS: z.coerce.number().int().positive().default(168),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  ALLOW_UNVERIFIED_EMAILS: boolFromString,
  SEED_DEMO_DATA: boolFromString,
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  DISCORD_REDIRECT_URI: optionalUrl,
  DISCORD_BOT_TOKEN: z.string().optional(),
  DISCORD_PUBLIC_KEY: z.string().optional(),
  DISCORD_NOTIFY_WEBHOOK_URL: optionalUrl,
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default('OpenTournament <no-reply@example.com>'),
  SMTP_SECURE: boolFromString,
  S3_ENDPOINT: z.string().url().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('opentournament'),
  S3_ACCESS_KEY: z.string().default('minioadmin'),
  S3_SECRET_KEY: z.string().default('minioadmin'),
  S3_FORCE_PATH_STYLE: boolFromString,
  MAX_EVIDENCE_SIZE_MB: z.coerce.number().int().positive().default(10),
  MAX_EVIDENCE_FILES_PER_SUBMISSION: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_GLOBAL_PER_MIN: z.coerce.number().int().positive().max(100_000).default(300),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;

export function loadApiEnv(env: NodeJS.ProcessEnv = process.env): ApiEnv {
  const parsed = apiEnvSchema.parse(env);
  if (parsed.NODE_ENV === 'production' && insecureProductionSecrets.has(parsed.SESSION_SECRET)) {
    throw new Error('SESSION_SECRET must be configured with a unique value in production.');
  }
  return parsed;
}

export const webEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
});

export type WebEnv = z.infer<typeof webEnvSchema>;

export function loadWebEnv(env: NodeJS.ProcessEnv = process.env): WebEnv {
  return webEnvSchema.parse(env);
}
