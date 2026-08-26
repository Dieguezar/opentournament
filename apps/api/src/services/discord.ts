import { createPublicKey, verify } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import {
  identities,
  teams,
  tournamentParticipants,
  tournamentRegistrations,
  tournaments,
  type Db,
} from '@opentournament/database';
import type { ApiEnv } from '@opentournament/config';
import { env } from '../config.js';
import { performCheckIn } from './checkin.js';

const DISCORD_API = 'https://discord.com/api/v10';
const SPKI_PREFIX = '302a300506032b6570032100';

/** Verify the Ed25519 signature of a Discord interaction. */
export function verifyDiscordRequest(
  publicKey: string,
  signature: string,
  timestamp: string,
  rawBody: string,
): boolean {
  try {
    const spki = Buffer.concat([Buffer.from(SPKI_PREFIX, 'hex'), Buffer.from(publicKey, 'hex')]);
    const key = createPublicKey({ key: spki, format: 'der', type: 'spki' });
    const message = Buffer.from(`${timestamp}${rawBody}`, 'utf8');
    const sig = Buffer.from(signature, 'hex');
    return verify(null, message, key, sig);
  } catch {
    return false;
  }
}

export async function registerSlashCommands(clientId: string, botToken: string): Promise<void> {
  const res = await fetch(`${DISCORD_API}/applications/${clientId}/commands`, {
    method: 'PUT',
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      {
        name: 'checkin',
        description: 'Hacer check-in de tu equipo en un torneo',
        options: [
          {
            name: 'torneo',
            description: 'ID del torneo',
            type: 3,
            required: true,
          },
        ],
      },
      {
        name: 'status',
        description: 'Estado de tu equipo en un torneo',
        options: [
          {
            name: 'torneo',
            description: 'ID del torneo',
            type: 3,
            required: true,
          },
        ],
      },
    ]),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord commands could not be registered: ${res.status} ${text}`);
  }
}

async function findCaptainTeam(db: Db, userId: string) {
  const [team] = await db
    .select()
    .from(teams)
    .where(and(eq(teams.captainId, userId), isNull(teams.deletedAt)))
    .limit(1);
  return team ?? null;
}

export async function handleInteraction(
  db: Db,
  payload: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  if (payload.type === 1) return { type: 1 }; // PING
  if (payload.type !== 2) {
    return { type: 4, data: { content: 'Unsupported interaction' } };
  }

  const member = payload.member as { user?: { id?: string } } | undefined;
  const user = payload.user as { id?: string } | undefined;
  const discordId = member?.user?.id ?? user?.id;
  const data = payload.data as { name?: string; options?: Array<{ value?: unknown }> };
  const tournamentId = data.options?.[0]?.value;

  if (typeof tournamentId !== 'string') {
    return { type: 4, data: { content: 'Falta el ID del torneo' } };
  }
  if (!discordId) {
    return { type: 4, data: { content: 'Your Discord account could not be identified' } };
  }

  const [identity] = await db
    .select({ userId: identities.userId })
    .from(identities)
    .where(and(eq(identities.provider, 'discord'), eq(identities.providerSub, discordId)))
    .limit(1);
  if (!identity) {
    return {
      type: 4,
      data: {
        content:
          'Your Discord account is not linked to OpenTournament. Sign in with Discord to link it.',
      },
    };
  }

  const team = await findCaptainTeam(db, identity.userId);
  if (!team) {
    return { type: 4, data: { content: 'You are not the captain of any team.' } };
  }

  if (data.name === 'checkin') {
    const result = await performCheckIn(db, tournamentId, team.id, identity.userId);
    const content = result.ok ? '✅ Check-in completado.' : `❌ ${result.message}`;
    return { type: 4, data: { content } };
  }

  if (data.name === 'status') {
    const [tournament] = await db
      .select()
      .from(tournaments)
      .where(eq(tournaments.id, tournamentId))
      .limit(1);
    if (!tournament) {
      return { type: 4, data: { content: 'Tournament not found.' } };
    }
    const [registration] = await db
      .select({ status: tournamentRegistrations.status })
      .from(tournamentRegistrations)
      .where(
        and(
          eq(tournamentRegistrations.tournamentId, tournamentId),
          eq(tournamentRegistrations.teamId, team.id),
        ),
      )
      .limit(1);
    const [participant] = await db
      .select({ checkedIn: tournamentParticipants.checkedIn })
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.teamId, team.id),
        ),
      )
      .limit(1);
    const content = [
      `**${tournament.name}** (${tournament.status})`,
      `Team: ${team.name}`,
      `Registration: ${registration?.status ?? 'not registered'}`,
      `Check-in: ${participant?.checkedIn ? '✅' : '❌'}`,
    ].join('\n');
    return { type: 4, data: { content } };
  }

  return { type: 4, data: { content: 'Comando desconocido.' } };
}

export function startDiscordBot(envConfig: ApiEnv): void {
  if (!envConfig.DISCORD_BOT_TOKEN || !envConfig.DISCORD_CLIENT_ID) {
    console.log('[discord-bot] Sin token o client id; bot deshabilitado.');
    return;
  }
  void registerSlashCommands(envConfig.DISCORD_CLIENT_ID, envConfig.DISCORD_BOT_TOKEN)
    .then(() => console.log('[discord-bot] Comandos slash registrados.'))
    .catch((error) => console.error('[discord-bot] Failed to register commands:', error));
}

export async function sendDiscordWebhook(content: string): Promise<void> {
  const url = env.DISCORD_NOTIFY_WEBHOOK_URL;
  if (!url) return;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  }).catch(() => undefined);
}
