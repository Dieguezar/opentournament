import { and, eq, isNull } from 'drizzle-orm';
import type { FastifyInstance } from 'fastify';
import {
  brackets,
  matches,
  rounds,
  stages,
  teams,
  tournamentAppearances,
  tournamentParticipants,
  tournaments,
} from '@opentournament/database';
import { db } from '../db.js';
import { buildTournamentPresentation } from '../services/overlay-presentation.js';

function notFound(reply: { status: (code: number) => { send: (body: unknown) => unknown } }) {
  return reply.status(404).send({
    error: { code: 'NOT_FOUND', message: 'The resource does not exist' },
  });
}

async function findTournamentPresentation(slug: string) {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(and(eq(tournaments.slug, slug), isNull(tournaments.deletedAt)))
    .limit(1);
  if (!tournament || tournament.visibility !== 'public' || !tournament.publishedAt) return null;

  const [appearance] = await db
    .select()
    .from(tournamentAppearances)
    .where(eq(tournamentAppearances.tournamentId, tournament.id))
    .limit(1);
  const participants = await db
    .select({
      id: tournamentParticipants.id,
      label: teams.name,
      status: tournamentParticipants.status,
    })
    .from(tournamentParticipants)
    .innerJoin(teams, eq(teams.id, tournamentParticipants.teamId))
    .where(eq(tournamentParticipants.tournamentId, tournament.id));
  const tournamentMatches = await db
    .select({
      id: matches.id,
      status: matches.status,
      scheduledAt: matches.scheduledAt,
      stagePosition: stages.position,
      bracketType: brackets.type,
      roundNumber: rounds.number,
      position: matches.position,
      homeParticipantId: matches.homeParticipantId,
      awayParticipantId: matches.awayParticipantId,
      result: matches.result,
    })
    .from(matches)
    .innerJoin(rounds, eq(rounds.id, matches.roundId))
    .innerJoin(brackets, eq(brackets.id, rounds.bracketId))
    .innerJoin(stages, eq(stages.id, brackets.stageId))
    .where(eq(matches.tournamentId, tournament.id));

  return buildTournamentPresentation({
    tournament: {
      id: tournament.id,
      slug: tournament.slug,
      name: tournament.name,
      visibility: tournament.visibility,
      publishedAt: tournament.publishedAt,
      deletedAt: tournament.deletedAt,
      status: tournament.status,
      appearance: appearance
        ? {
            logoMediaId: appearance.logoMediaId,
            bannerMediaId: appearance.bannerMediaId,
            primaryColor: appearance.primaryColor,
            secondaryColor: appearance.secondaryColor,
            accentColor: appearance.accentColor,
          }
        : null,
    },
    participants,
    matches: tournamentMatches.map((match) => ({
      id: match.id,
      status: match.status,
      scheduledAt: match.scheduledAt,
      stagePosition: match.stagePosition,
      bracketType: match.bracketType,
      roundNumber: match.roundNumber,
      position: match.position,
      homeParticipantId: match.homeParticipantId,
      awayParticipantId: match.awayParticipantId,
      homeScore: match.result?.homeScore ?? null,
      awayScore: match.result?.awayScore ?? null,
    })),
  });
}

export async function registerOverlayRoutes(app: FastifyInstance): Promise<void> {
  app.get('/tournaments/by-slug/:slug/overlay', async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const overlay = await findTournamentPresentation(slug);
    if (!overlay) return notFound(reply);

    return reply.header('Cache-Control', 'no-cache, no-store, must-revalidate').send({ overlay });
  });
}
