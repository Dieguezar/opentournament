import Image from 'next/image';
import Link from 'next/link';

import { formatMessage, type Dictionary } from '../lib/i18n';
import styles from './public-player-profile.module.css';

export interface PublicProfileAvatar {
  id: string;
  kind: string;
  url: string;
  width: number;
  height: number;
}

export interface PublicPlayerProfileData {
  slug: string;
  gamertag: string;
  avatar?: PublicProfileAvatar;
  realName?: string;
  biography?: string;
}

interface PublicParticipantNameProps {
  label: string;
  profile?: Pick<PublicPlayerProfileData, 'slug'>;
}

const PROFILE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MEDIA_PATH =
  /^\/api\/v1\/media\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isPublicProfileSlug(slug: string): boolean {
  return slug.length >= 2 && slug.length <= 40 && PROFILE_SLUG.test(slug);
}

function sameOriginAvatarPath(avatar: PublicProfileAvatar | undefined): string | null {
  return avatar && MEDIA_PATH.test(avatar.url) ? avatar.url : null;
}

export function PublicParticipantName({ label, profile }: PublicParticipantNameProps) {
  if (!profile || !isPublicProfileSlug(profile.slug)) return <>{label}</>;
  return <Link href={`/players/${encodeURIComponent(profile.slug)}`}>{label}</Link>;
}

export function PublicPlayerProfile({
  profile,
  copy,
}: {
  profile: PublicPlayerProfileData;
  copy: Dictionary['publicPlayer'];
}) {
  const avatarPath = sameOriginAvatarPath(profile.avatar);

  return (
    <article className={styles.profile}>
      <div className={styles.header}>
        {avatarPath && (
          <Image
            alt={formatMessage(copy.avatarAlt, { gamertag: profile.gamertag })}
            className={styles.avatar}
            height={profile.avatar!.height}
            src={avatarPath}
            unoptimized
            width={profile.avatar!.width}
          />
        )}
        <div>
          <p className={styles.eyebrow}>{copy.eyebrow}</p>
          <h1>{profile.gamertag}</h1>
          {profile.realName && <p className={styles.realName}>{profile.realName}</p>}
        </div>
      </div>
      {profile.biography && <p className={styles.biography}>{profile.biography}</p>}
    </article>
  );
}
