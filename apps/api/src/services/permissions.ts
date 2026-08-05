import { and, eq, isNull } from 'drizzle-orm';
import {
  organizationMembers,
  teamMembers,
  teams,
  tournamentStaff,
  tournaments,
  type Db,
} from '@opentournament/database';

export async function getOrgMembership(db: Db, organizationId: string, userId: string) {
  const [member] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);
  return member ?? null;
}

export async function getTournament(
  db: Db,
  tournamentId: string,
): Promise<typeof tournaments.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(tournaments)
    .where(and(eq(tournaments.id, tournamentId), isNull(tournaments.deletedAt)))
    .limit(1);
  return row ?? null;
}

export async function isTournamentAdmin(
  db: Db,
  tournamentId: string,
  userId: string,
): Promise<boolean> {
  const tournament = await getTournament(db, tournamentId);
  if (!tournament) return false;

  const staff = await db
    .select({ id: tournamentStaff.id })
    .from(tournamentStaff)
    .where(
      and(
        eq(tournamentStaff.tournamentId, tournamentId),
        eq(tournamentStaff.userId, userId),
        eq(tournamentStaff.role, 'admin'),
      ),
    )
    .limit(1);
  if (staff.length > 0) return true;

  const member = await getOrgMembership(db, tournament.organizationId, userId);
  return member?.role === 'admin' || member?.role === 'owner';
}

export async function isOrgMember(
  db: Db,
  organizationId: string,
  userId: string,
): Promise<boolean> {
  const member = await getOrgMembership(db, organizationId, userId);
  return member !== null;
}

export async function isTeamCaptain(db: Db, teamId: string, userId: string): Promise<boolean> {
  const [team] = await db
    .select({ captainId: teams.captainId })
    .from(teams)
    .where(and(eq(teams.id, teamId), isNull(teams.deletedAt)))
    .limit(1);
  return team?.captainId === userId;
}

export async function isTeamMember(db: Db, teamId: string, userId: string): Promise<boolean> {
  const [member] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
    .limit(1);
  return member !== null;
}
