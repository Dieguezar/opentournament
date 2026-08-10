import { and, eq } from 'drizzle-orm';
import {
  checkIns,
  organizationMembers,
  tournamentParticipants,
  tournamentRegistrations,
  tournamentStaff,
  tournaments,
  type Db,
} from '@opentournament/database';

export async function tournamentAdminIds(db: Db, tournamentId: string): Promise<string[]> {
  const [tournament] = await db
    .select({ organizationId: tournaments.organizationId })
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament) return [];

  const staff = await db
    .select({ userId: tournamentStaff.userId })
    .from(tournamentStaff)
    .where(
      and(
        eq(tournamentStaff.tournamentId, tournamentId),
        eq(tournamentStaff.role, 'admin'),
      ),
    );
  const members = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, tournament.organizationId),
        eq(organizationMembers.role, 'admin'),
      ),
    );
  const owners = await db
    .select({ userId: organizationMembers.userId })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, tournament.organizationId),
        eq(organizationMembers.role, 'owner'),
      ),
    );
  return [...new Set([...staff, ...members, ...owners].map((r) => r.userId))];
}

export type CheckInResult =
  | { ok: true }
  | { ok: false; code: string; message: string };

export async function performCheckIn(
  db: Db,
  tournamentId: string,
  teamId: string,
  userId: string,
): Promise<CheckInResult> {
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, tournamentId))
    .limit(1);
  if (!tournament) return { ok: false, code: 'NOT_FOUND', message: 'Torneo no encontrado' };
  if (!['open', 'checkin_open', 'in_progress'].includes(tournament.status)) {
    return { ok: false, code: 'INVALID_STATUS', message: 'El check-in no está disponible' };
  }
  const closesAt = tournament.checkinConfig?.closesAt
    ? new Date(tournament.checkinConfig.closesAt)
    : null;
  if (closesAt && closesAt < new Date()) {
    return { ok: false, code: 'CHECKIN_CLOSED', message: 'El check-in ya cerró' };
  }

  const [registration] = await db
    .select({ id: tournamentRegistrations.id })
    .from(tournamentRegistrations)
    .where(
      and(
        eq(tournamentRegistrations.tournamentId, tournamentId),
        eq(tournamentRegistrations.teamId, teamId),
        eq(tournamentRegistrations.status, 'approved'),
      ),
    )
    .limit(1);
  if (!registration) {
    return { ok: false, code: 'NOT_REGISTERED', message: 'El equipo no está aprobado' };
  }

  await db
    .update(tournamentParticipants)
    .set({ checkedIn: true })
    .where(
      and(
        eq(tournamentParticipants.tournamentId, tournamentId),
        eq(tournamentParticipants.teamId, teamId),
      ),
    );
  await db
    .insert(checkIns)
    .values({ tournamentId, teamId, userId })
    .onConflictDoNothing();
  return { ok: true };
}
