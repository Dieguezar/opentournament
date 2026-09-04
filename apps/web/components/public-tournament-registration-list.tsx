import { PublicParticipantName, type PublicPlayerProfileData } from './public-player-profile';
import { formatMessage, type Dictionary, type Locale } from '../lib/i18n';
import { formatRegistrationStatus } from '../lib/presentation';

export interface PublicTournamentRegistration {
  teamId: string;
  teamName: string;
  teamTag: string | null;
  registrationStatus: string;
  checkedIn: boolean | null;
}

export interface PublicTournamentParticipant {
  teamId: string;
  label: string;
  profile?: Pick<PublicPlayerProfileData, 'slug'>;
}

interface PublicTournamentRegistrationListProps {
  registrations: PublicTournamentRegistration[];
  participants: PublicTournamentParticipant[];
  locale: Locale;
  copy: Pick<Dictionary['publicTournament'], 'tag' | 'noTag' | 'checkedIn' | 'notCheckedIn'>;
  listClassName: string | undefined;
  metaClassName: string | undefined;
}

export function PublicTournamentRegistrationList({
  registrations,
  participants,
  locale,
  copy,
  listClassName,
  metaClassName,
}: PublicTournamentRegistrationListProps) {
  const profileByTeamId = new Map(
    participants.flatMap(({ teamId, profile }) => (profile ? [[teamId, profile] as const] : [])),
  );

  return (
    <ul className={listClassName}>
      {registrations.map((team) => (
        <li key={team.teamId}>
          <span>
            <strong>
              <PublicParticipantName
                label={team.teamName}
                profile={profileByTeamId.get(team.teamId)}
              />
            </strong>
            <small className={metaClassName}>
              {team.teamTag ? formatMessage(copy.tag, { tag: team.teamTag }) : copy.noTag}
            </small>
          </span>
          {team.registrationStatus === 'approved' ? (
            <span className={`badge ${team.checkedIn ? 'badge-success' : 'badge-warn'}`}>
              {team.checkedIn ? copy.checkedIn : copy.notCheckedIn}
            </span>
          ) : (
            <span className="badge">
              {formatRegistrationStatus(team.registrationStatus, locale)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
